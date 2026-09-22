import { z } from '../../config/zod.js';
import { partialUpdate, slugInputSchema } from '../../utils/commonSchemas.js';

const categoryFields = z.object({
  name: z.string().trim().min(2).max(100),
  slug: slugInputSchema,
});

export const createCategorySchema = categoryFields.extend({
  slug: slugInputSchema.optional(),
});

export const updateCategorySchema = partialUpdate(categoryFields);
