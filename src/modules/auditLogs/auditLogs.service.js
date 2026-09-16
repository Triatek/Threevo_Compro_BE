import { prisma } from '../../lib/prisma.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

export async function listAuditLogs({ page, limit, entity, action, userId }) {
  const where = {
    ...(entity && { entity }),
    ...(action && { action }),
    ...(userId && { userId }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      ...getPagination({ page, limit }),
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}
