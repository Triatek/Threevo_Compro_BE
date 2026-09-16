import { z } from '../../config/zod.js';
import { paginationSchema } from '../../utils/pagination.js';

export const listAuditLogsQuerySchema = paginationSchema.extend({
  entity: z.string().trim().max(50).optional(),
  action: z.string().trim().toUpperCase().max(50).optional(),
  userId: z.coerce.number().int().positive().optional(),
});
