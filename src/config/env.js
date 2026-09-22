import dotenv from 'dotenv';
import { z, formatZodIssues } from './zod.js';

dotenv.config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
  quiet: true,
});

const booleanString = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    API_PREFIX: z.string().startsWith('/').default('/api/v1'),
    SITE_URL: z.url().default('http://localhost:5173'),
    API_URL: z.url().default('http://localhost:4000'),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    // Number of hops, or a value Express understands ("loopback", "true", ...).
    TRUST_PROXY: z
      .string()
      .default('0')
      .transform((value) => {
        if (/^\d+$/.test(value)) return Number(value);
        if (value === 'true' || value === 'false') return value === 'true';
        return value;
      }),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    DATABASE_URL: z.string().min(1),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
    COOKIE_DOMAIN: z.string().optional(),
    COOKIE_SECURE: booleanString.optional(),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: booleanString.optional(),
    MAIL_FROM: z.string().default('Threevo <no-reply@example.com>'),
    LEAD_NOTIFICATION_EMAIL: z.email().optional(),

    TURNSTILE_SECRET_KEY: z.string().optional(),

    UPLOAD_DIR: z.string().default('uploads'),
    UPLOAD_MAX_SIZE_MB: z.coerce.number().positive().default(5),

    TRACKING_PROVIDER: z.enum(['mock', 'http']).default('mock'),
    TRACKING_API_URL: z.url().optional(),
    TRACKING_API_KEY: z.string().optional(),
    TRACKING_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),

    CACHE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(300),
    ENABLE_DOCS: booleanString.optional(),

    SEED_ADMIN_NAME: z.string().default('Super Admin'),
    SEED_ADMIN_EMAIL: z.email().default('admin@threevo.local'),
    SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.TRACKING_PROVIDER === 'http' && !value.TRACKING_API_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['TRACKING_API_URL'],
        message: 'Wajib diisi jika TRACKING_PROVIDER=http',
      });
    }
  })
  .transform((value) => {
    const isProduction = value.NODE_ENV === 'production';
    return {
      ...value,
      COOKIE_SECURE: value.COOKIE_SECURE ?? isProduction,
      ENABLE_DOCS: value.ENABLE_DOCS ?? !isProduction,
      SMTP_SECURE: value.SMTP_SECURE ?? false,
      isProduction,
      isDevelopment: value.NODE_ENV === 'development',
      isTest: value.NODE_ENV === 'test',
    };
  });

// Empty strings in .env mean "not set".
const rawEnv = Object.fromEntries(
  Object.entries(process.env).map(([key, value]) => [key, value === '' ? undefined : value]),
);

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  // Logger depends on env, so plain console is used here. Fail fast.
  console.error('Invalid environment variables:');
  for (const { field, message } of formatZodIssues(parsed.error.issues)) {
    console.error(`  - ${field}: ${message}`);
  }
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
