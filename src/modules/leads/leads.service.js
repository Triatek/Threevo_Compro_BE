import { env } from '../../config/env.js';
import { AuditAction, writeAuditLog } from '../../lib/audit.js';
import { captcha } from '../../lib/captcha.js';
import { logger } from '../../lib/logger.js';
import { mailer } from '../../lib/mailer.js';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../../utils/AppError.js';
import { toCsv } from '../../utils/csv.js';
import {
  endOfBusinessDay,
  formatBusinessDateTime,
  startOfBusinessDay,
} from '../../utils/date.js';
import { escapeHtml } from '../../utils/escapeHtml.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { getSettingValue } from '../settings/settings.service.js';

const ENTITY = 'Lead';
const NOT_FOUND = 'Lead tidak ditemukan';
const EXPORT_MAX_ROWS = 10_000;

const STATUS_LABELS = { NEW: 'Baru', CONTACTED: 'Dihubungi', CLOSED: 'Selesai' };

// ---------- Public ----------

/** "https://www.google.com/search?q=x" -> "www.google.com/search" */
function sourceFromReferer(referer) {
  if (!referer) return undefined;
  try {
    const url = new URL(referer);
    return `${url.host}${url.pathname === '/' ? '' : url.pathname}`;
  } catch {
    return undefined;
  }
}

/**
 * Save a contact form submission.
 * @returns {Promise<object|null>} the lead, or null when the honeypot caught a bot
 */
export async function createLead(input, meta) {
  const { website, captchaToken, ...data } = input;

  if (website) {
    logger.warn({ ipAddress: meta.ipAddress }, 'Lead honeypot triggered, submission ignored');
    return null;
  }

  const captchaValid = await captcha.verify(captchaToken, meta.ipAddress);
  if (!captchaValid) {
    throw new BadRequestError('Verifikasi CAPTCHA gagal, silakan coba lagi');
  }

  return prisma.lead.create({
    data: {
      ...data,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
      source: (meta.utmSource ?? sourceFromReferer(meta.referer))?.slice(0, 100) ?? null,
    },
  });
}

function buildLeadEmail(lead) {
  const rows = [
    ['Nama', lead.name],
    ['Email', lead.email],
    ['Telepon', lead.phone],
    ['Perusahaan', lead.company],
    ['Layanan', lead.serviceInterest],
    ['Sumber', lead.source],
    ['Waktu', `${formatBusinessDateTime(lead.createdAt)} WIB`],
  ];

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#555"><strong>${label}</strong></td>` +
        `<td style="padding:4px 0">${escapeHtml(value ?? '-')}</td></tr>`,
    )
    .join('');
  const adminUrl = `${env.SITE_URL.replace(/\/+$/, '')}/admin/leads/${lead.id}`;

  return {
    subject: `[Lead Baru] ${lead.name}${lead.company ? ` - ${lead.company}` : ''}`,
    html:
      `<h2>Lead baru dari website</h2><table>${htmlRows}</table>` +
      `<p><strong>Pesan:</strong></p><p style="white-space:pre-line">${escapeHtml(lead.message)}</p>` +
      `<p><a href="${escapeHtml(adminUrl)}">Lihat di panel admin</a></p>`,
    text:
      `Lead baru dari website\n\n${rows.map(([label, value]) => `${label}: ${value ?? '-'}`).join('\n')}` +
      `\n\nPesan:\n${lead.message}\n\nPanel admin: ${adminUrl}`,
  };
}

/**
 * Email the marketing team. Never throws: failures are only logged because the
 * lead is already saved and the visitor already got a response.
 */
export async function notifyNewLead(lead) {
  try {
    const recipients = (await getSettingValue('lead_notification_email')) || env.LEAD_NOTIFICATION_EMAIL;
    if (!recipients) {
      logger.warn({ leadId: lead.id }, 'No lead notification email configured, skipping email');
      return;
    }

    await mailer.send({ to: recipients, replyTo: lead.email, ...buildLeadEmail(lead) });
  } catch (err) {
    logger.error({ err, leadId: lead.id }, 'Failed to send lead notification email');
  }
}

// ---------- Admin ----------

function buildWhere({ status, q, from, to }) {
  return {
    deletedAt: null,
    ...(status && { status }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: startOfBusinessDay(from) }),
        ...(to && { lte: endOfBusinessDay(to) }),
      },
    }),
    ...(q && {
      OR: ['name', 'email', 'company', 'phone'].map((field) => ({
        [field]: { contains: q, mode: 'insensitive' },
      })),
    }),
  };
}

const omitDeleted = { deletedAt: true };

export async function listLeads({ page, limit, ...filters }) {
  const where = buildWhere(filters);
  const [items, total] = await prisma.$transaction([
    prisma.lead.findMany({
      where,
      omit: { ...omitDeleted, message: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...getPagination({ page, limit }),
    }),
    prisma.lead.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}

export async function getLeadById(id) {
  const lead = await prisma.lead.findFirst({ where: { id, deletedAt: null }, omit: omitDeleted });
  if (!lead) throw new NotFoundError(NOT_FOUND);
  return lead;
}

export async function updateLead(actor, id, data) {
  const existing = await getLeadById(id);
  const lead = await prisma.lead.update({ where: { id }, data, omit: omitDeleted });

  await writeAuditLog(actor, {
    action: AuditAction.UPDATE,
    entity: ENTITY,
    entityId: id,
    metadata: {
      fields: Object.keys(data),
      ...(data.status && data.status !== existing.status && { from: existing.status, to: data.status }),
    },
  });
  return lead;
}

export async function deleteLead(actor, id) {
  await getLeadById(id);
  await prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAuditLog(actor, { action: AuditAction.DELETE, entity: ENTITY, entityId: id });
}

export async function exportLeadsCsv(actor, filters) {
  const leads = await prisma.lead.findMany({
    where: buildWhere(filters),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: EXPORT_MAX_ROWS,
  });

  const csv = toCsv(
    ['ID', 'Tanggal (WIB)', 'Nama', 'Email', 'Telepon', 'Perusahaan', 'Layanan', 'Pesan', 'Status', 'Catatan', 'Sumber'],
    leads.map((lead) => [
      lead.id,
      formatBusinessDateTime(lead.createdAt),
      lead.name,
      lead.email,
      lead.phone,
      lead.company,
      lead.serviceInterest,
      lead.message,
      STATUS_LABELS[lead.status],
      lead.notes,
      lead.source,
    ]),
  );

  // Exporting personal data is worth tracing.
  await writeAuditLog(actor, {
    action: AuditAction.EXPORT,
    entity: ENTITY,
    metadata: { filters, count: leads.length },
  });
  return csv;
}
