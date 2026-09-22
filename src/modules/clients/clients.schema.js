import { z } from '../../config/zod.js';
import {
  httpUrlSchema,
  imageUrlSchema,
  partialUpdate,
  sortOrderSchema,
} from '../../utils/commonSchemas.js';

const clientFields = z.object({
  name: z.string().trim().min(1).max(150),
  logo: imageUrlSchema,
  website: httpUrlSchema.nullable(),
  sortOrder: sortOrderSchema,
  isActive: z.boolean(),
});

export const createClientSchema = clientFields.extend({
  website: clientFields.shape.website.optional(),
  sortOrder: sortOrderSchema.default(0),
  isActive: z.boolean().default(true),
});

export const updateClientSchema = partialUpdate(clientFields);
