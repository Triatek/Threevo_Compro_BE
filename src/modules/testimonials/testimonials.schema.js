import { z } from '../../config/zod.js';
import { imageUrlSchema, partialUpdate, sortOrderSchema } from '../../utils/commonSchemas.js';

const testimonialFields = z.object({
  name: z.string().trim().min(1).max(100),
  position: z.string().trim().max(100).nullable(),
  company: z.string().trim().max(150).nullable(),
  message: z.string().trim().min(1).max(2000),
  photo: imageUrlSchema.nullable(),
  sortOrder: sortOrderSchema,
  isActive: z.boolean(),
});

export const createTestimonialSchema = testimonialFields.extend({
  position: testimonialFields.shape.position.optional(),
  company: testimonialFields.shape.company.optional(),
  photo: testimonialFields.shape.photo.optional(),
  sortOrder: sortOrderSchema.default(0),
  isActive: z.boolean().default(true),
});

export const updateTestimonialSchema = partialUpdate(testimonialFields);
