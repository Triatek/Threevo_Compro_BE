import { z } from '../../config/zod.js';
import { emailSchema } from '../../utils/commonSchemas.js';
import { paginationSchema } from '../../utils/pagination.js';

/** Optional text from a form: "" becomes undefined. */
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

export const leadStatusSchema = z.enum(['NEW', 'CONTACTED', 'CLOSED']);

export const createLeadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  phone: optionalText(30).refine(
    (value) => value === undefined || /^\+?[\d\s\-().]{6,30}$/.test(value),
    'Nomor telepon tidak valid',
  ),
  company: optionalText(150),
  serviceInterest: optionalText(150),
  message: z.string().trim().min(10).max(5000),
  // Honeypot: hidden field in the form, humans leave it empty.
  website: z.string().max(500).optional(),
  captchaToken: z.string().max(2048).optional(),
});

export const createLeadQuerySchema = z.object({
  utm_source: optionalText(100),
});

const dateOnly = z.iso.date();

const leadFilterFields = {
  status: z.string().trim().toUpperCase().pipe(leadStatusSchema).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
};

const validDateRange = [
  (value) => !value.from || !value.to || value.from <= value.to,
  { path: ['to'], message: 'Tanggal akhir harus sama atau setelah tanggal awal' },
];

export const leadFiltersSchema = z.object(leadFilterFields).refine(...validDateRange);

export const listLeadsQuerySchema = paginationSchema.extend(leadFilterFields).refine(...validDateRange);

export const updateLeadSchema = z
  .object({
    status: leadStatusSchema,
    notes: z.string().trim().max(5000).nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Minimal satu field harus diisi' });
