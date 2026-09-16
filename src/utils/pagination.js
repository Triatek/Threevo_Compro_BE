import { z } from '../config/zod.js';

export const MAX_LIMIT = 50;

/** Base query schema; extend it with module specific filters. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(10),
});

/** Prisma `skip`/`take` from page & limit. */
export function getPagination({ page = 1, limit = 10 } = {}) {
  return { skip: (page - 1) * limit, take: limit };
}

export function buildPaginationMeta({ page, limit, total }) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
