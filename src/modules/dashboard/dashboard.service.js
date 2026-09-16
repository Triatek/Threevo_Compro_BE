import { prisma } from '../../lib/prisma.js';
import { BUSINESS_TIMEZONE, formatBusinessDate, startOfBusinessDay } from '../../utils/date.js';

const DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function countByStatus(groups, statuses) {
  const counts = Object.fromEntries(statuses.map((status) => [status, 0]));
  for (const group of groups) counts[group.status] = group._count._all;
  return { ...counts, total: Object.values(counts).reduce((sum, n) => sum + n, 0) };
}

/** Last 30 business days (including today), oldest first, missing days = 0. */
async function leadsPerDay(now) {
  const today = formatBusinessDate(now);
  const since = new Date(startOfBusinessDay(today).getTime() - (DAYS - 1) * DAY_MS);

  // created_at is stored in UTC; convert to business timezone before grouping by day.
  const rows = await prisma.$queryRaw`
    SELECT to_char(created_at AT TIME ZONE 'UTC' AT TIME ZONE ${BUSINESS_TIMEZONE}, 'YYYY-MM-DD') AS day,
           COUNT(*)::int AS count
    FROM leads
    WHERE deleted_at IS NULL
      AND created_at >= (${since.toISOString()}::timestamptz AT TIME ZONE 'UTC')
    GROUP BY day
  `;
  const counts = new Map(rows.map((row) => [row.day, row.count]));

  return Array.from({ length: DAYS }, (_, index) => {
    const date = formatBusinessDate(new Date(since.getTime() + index * DAY_MS));
    return { date, count: counts.get(date) ?? 0 };
  });
}

export async function getDashboard(now = new Date()) {
  const [articleGroups, leadGroups, leadsLast30Days, recentLeads] = await Promise.all([
    prisma.article.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
    leadsPerDay(now),
    prisma.lead.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, email: true, company: true, serviceInterest: true, status: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 5,
    }),
  ]);

  return {
    articles: countByStatus(articleGroups, ['DRAFT', 'PUBLISHED']),
    leads: countByStatus(leadGroups, ['NEW', 'CONTACTED', 'CLOSED']),
    leadsLast30Days,
    recentLeads,
  };
}
