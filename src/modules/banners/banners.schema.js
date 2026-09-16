import { z } from '../../config/zod.js';
import {
  imageUrlSchema,
  linkSchema,
  partialUpdate,
  sortOrderSchema,
} from '../../utils/commonSchemas.js';

const bannerFields = z.object({
  title: z.string().trim().min(1).max(150),
  subtitle: z.string().trim().max(300).nullable(),
  image: imageUrlSchema,
  ctaText: z.string().trim().max(50).nullable(),
  ctaLink: linkSchema.nullable(),
  sortOrder: sortOrderSchema,
  isActive: z.boolean(),
});

export const createBannerSchema = bannerFields.extend({
  subtitle: bannerFields.shape.subtitle.optional(),
  ctaText: bannerFields.shape.ctaText.optional(),
  ctaLink: bannerFields.shape.ctaLink.optional(),
  sortOrder: sortOrderSchema.default(0),
  isActive: z.boolean().default(true),
});

export const updateBannerSchema = partialUpdate(bannerFields);
