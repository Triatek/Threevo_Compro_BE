import { z } from '../../config/zod.js';
import {
  booleanQuerySchema,
  imageUrlSchema,
  partialUpdate,
  slugInputSchema,
  sortOrderSchema,
} from '../../utils/commonSchemas.js';
import { paginationSchema } from '../../utils/pagination.js';

const serviceFields = z.object({
  name: z.string().trim().min(2).max(150),
  slug: slugInputSchema,
  shortDesc: z.string().trim().max(300).nullable(),
  content: z.string().max(100_000).nullable(),
  // Icon name used by the frontend (e.g. "warehouse") or an image URL.
  icon: z.string().trim().max(500).nullable(),
  image: imageUrlSchema.nullable(),
  metaTitle: z.string().trim().max(70).nullable(),
  metaDescription: z.string().trim().max(160).nullable(),
  isFeatured: z.boolean(),
  sortOrder: sortOrderSchema,
  isActive: z.boolean(),
});

export const createServiceSchema = serviceFields.partial().extend({
  name: serviceFields.shape.name,
  isFeatured: z.boolean().default(false),
  sortOrder: sortOrderSchema.default(0),
  isActive: z.boolean().default(true),
});

export const updateServiceSchema = partialUpdate(serviceFields);

export const listServicesQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  isActive: booleanQuerySchema.optional(),
  isFeatured: booleanQuerySchema.optional(),
});
