import { z } from '../../config/zod.js';
import { paginationSchema } from '../../utils/pagination.js';

export const uploadMediaSchema = z.object({
  alt: z.string().trim().max(200).optional(),
});

export const listMediaQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
});
