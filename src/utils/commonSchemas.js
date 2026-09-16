import { z } from '../config/zod.js';

/** `:id` route param */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/** `:slug` route param */
export const slugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug tidak valid')
    .max(220),
});

/** Normalized email (trimmed, lowercase) */
export const emailSchema = z.string().trim().toLowerCase().max(150).pipe(z.email());

/** Optional slug sent by admins; normalized later with slugify(). */
export const slugInputSchema = z.string().trim().min(1).max(200);

/** "true"/"false" in query strings */
export const booleanQuerySchema = z.stringbool();

/**
 * Image reference: absolute http(s) URL or a path served by this API (/uploads/...).
 */
export const imageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => /^https?:\/\/\S+$/i.test(value) || /^\/uploads\/[\w\-./]+$/.test(value),
    'Harus berupa URL http(s) atau path /uploads/...',
  );

/** http(s) URL, empty string not allowed (send null to clear). */
export const httpUrlSchema = z.httpUrl().max(500);

/** Link used by buttons: absolute http(s) URL or a site-relative path like "/kontak". */
export const linkSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => /^https?:\/\/\S+$/i.test(value) || /^\/(?!\/)\S*$/.test(value),
    'Harus berupa URL http(s) atau path yang diawali "/"',
  );

/** Body of `PATCH /<resource>/reorder` */
export const reorderSchema = z
  .array(
    z.object({
      id: z.number().int().positive(),
      sortOrder: z.number().int().min(0).max(100000),
    }),
  )
  .min(1)
  .max(500)
  .refine((items) => new Set(items.map((item) => item.id)).size === items.length, {
    message: 'ID tidak boleh duplikat',
  });

export const sortOrderSchema = z.number().int().min(0).max(100000);

/** Make every key optional and require at least one key (for PATCH bodies). */
export function partialUpdate(schema) {
  return schema.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'Minimal satu field harus diisi',
  });
}
