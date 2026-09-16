import { z } from '../../config/zod.js';
import { imageUrlSchema, partialUpdate, slugInputSchema } from '../../utils/commonSchemas.js';
import { paginationSchema } from '../../utils/pagination.js';

const statusSchema = z.enum(['DRAFT', 'PUBLISHED']);

/** ISO 8601 date-time with timezone, e.g. "2026-01-31T09:00:00+07:00" */
const dateTimeSchema = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

const articleFields = z.object({
  title: z.string().trim().min(3).max(200),
  slug: slugInputSchema,
  excerpt: z.string().trim().max(500).nullable(),
  content: z.string().min(1).max(200_000),
  coverImage: imageUrlSchema.nullable(),
  status: statusSchema,
  publishedAt: dateTimeSchema.nullable(),
  metaTitle: z.string().trim().max(70).nullable(),
  metaDescription: z.string().trim().max(160).nullable(),
  categoryId: z.number().int().positive().nullable(),
});

export const createArticleSchema = articleFields.partial().extend({
  title: articleFields.shape.title,
  content: articleFields.shape.content,
  status: statusSchema.default('DRAFT'),
});

export const updateArticleSchema = partialUpdate(articleFields);

const searchSchema = z.string().trim().min(1).max(100).optional();
const categorySlugSchema = z.string().trim().toLowerCase().max(120).optional();

export const publicArticlesQuerySchema = paginationSchema.extend({
  category: categorySlugSchema,
  q: searchSchema,
});

export const listArticlesQuerySchema = paginationSchema.extend({
  status: z.string().trim().toUpperCase().pipe(statusSchema).optional(),
  category: categorySlugSchema,
  categoryId: z.coerce.number().int().positive().optional(),
  q: searchSchema,
});
