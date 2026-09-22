import { z } from '../../config/zod.js';
import { emailSchema } from '../../utils/commonSchemas.js';

const empty = z.literal('');
const text = (max) => z.string().trim().max(max);
const urlOrEmpty = z.union([empty, z.httpUrl().max(500)]);

/** Comma separated list of emails, e.g. "a@x.com, b@x.com" */
const emailListOrEmpty = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) =>
      value === '' ||
      value.split(',').every((email) => emailSchema.safeParse(email.trim()).success),
    'Harus berupa email yang valid (pisahkan dengan koma untuk lebih dari satu)',
  );

/**
 * Every setting the application knows. Only these keys can be stored.
 * `isPublic: false` values are never returned by public endpoints.
 */
export const SETTING_DEFINITIONS = Object.freeze({
  company_name: { isPublic: true, schema: text(150) },
  company_tagline: { isPublic: true, schema: text(300) },
  contact_phone: { isPublic: true, schema: text(50) },
  contact_email: { isPublic: true, schema: z.union([empty, emailSchema]) },
  contact_address: { isPublic: true, schema: text(500) },
  contact_maps_url: { isPublic: true, schema: urlOrEmpty },
  whatsapp_number: {
    isPublic: true,
    schema: z.union([
      empty,
      z
        .string()
        .trim()
        .regex(/^[1-9]\d{7,14}$/, 'Gunakan format internasional tanpa "+", mis. 6281234567890'),
    ]),
  },
  whatsapp_message: { isPublic: true, schema: text(500) },
  social_instagram: { isPublic: true, schema: urlOrEmpty },
  social_linkedin: { isPublic: true, schema: urlOrEmpty },
  social_youtube: { isPublic: true, schema: urlOrEmpty },
  social_tiktok: { isPublic: true, schema: urlOrEmpty },
  tracking_url: { isPublic: true, schema: urlOrEmpty },
  footer_text: { isPublic: true, schema: text(500) },
  lead_notification_email: { isPublic: false, schema: emailListOrEmpty },
});

export const SETTING_KEYS = Object.keys(SETTING_DEFINITIONS);

/** PUT body: any subset of known keys; unknown keys are rejected. */
export const updateSettingsSchema = z
  .strictObject(
    Object.fromEntries(
      Object.entries(SETTING_DEFINITIONS).map(([key, { schema }]) => [key, schema.optional()]),
    ),
  )
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Minimal satu setting harus diisi',
  });
