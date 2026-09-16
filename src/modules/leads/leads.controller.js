import { actorFromRequest } from '../../lib/audit.js';
import { formatBusinessDate } from '../../utils/date.js';
import { sendCreated, sendSuccess } from '../../utils/response.js';
import * as leadsService from './leads.service.js';

const THANK_YOU_MESSAGE = 'Terima kasih, pesan Anda telah terkirim. Tim kami akan segera menghubungi Anda.';

// ---------- Public ----------

export async function create(req, res) {
  const lead = await leadsService.createLead(req.validated.body, {
    ipAddress: actorFromRequest(req).ipAddress,
    userAgent: req.get('user-agent'),
    referer: req.get('referer'),
    utmSource: req.validated.query.utm_source,
  });

  // Bots caught by the honeypot get the same response as humans.
  sendCreated(res, null, { message: THANK_YOU_MESSAGE });

  // Fire and forget: the visitor does not wait for the email.
  if (lead) leadsService.notifyNewLead(lead);
}

// ---------- Admin ----------

export async function list(req, res) {
  const { items, meta } = await leadsService.listLeads(req.validated.query);
  sendSuccess(res, items, { meta });
}

export async function getById(req, res) {
  sendSuccess(res, await leadsService.getLeadById(req.validated.params.id));
}

export async function update(req, res) {
  const lead = await leadsService.updateLead(
    actorFromRequest(req),
    req.validated.params.id,
    req.validated.body,
  );
  sendSuccess(res, lead, { message: 'Lead berhasil diperbarui' });
}

export async function remove(req, res) {
  await leadsService.deleteLead(actorFromRequest(req), req.validated.params.id);
  sendSuccess(res, null, { message: 'Lead berhasil dihapus' });
}

export async function exportCsv(req, res) {
  const csv = await leadsService.exportLeadsCsv(actorFromRequest(req), req.validated.query);
  const filename = `leads-${formatBusinessDate(new Date())}.csv`;

  res
    .status(200)
    .set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    })
    .send(csv);
}
