import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { TooManyRequestsError } from '../utils/AppError.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/**
 * Rate limiter factory. Limiters are skipped when NODE_ENV=test unless
 * `skipInTest: false` is passed (used by the dedicated rate limit test).
 */
export function createRateLimiter({
  windowMs = FIFTEEN_MINUTES,
  limit,
  message = 'Terlalu banyak permintaan, silakan coba lagi nanti',
  skipInTest = true,
}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => skipInTest && env.isTest,
    handler: (req, res, next) => next(new TooManyRequestsError(message)),
  });
}

export const globalLimiter = createRateLimiter({ limit: 300 });

export const loginLimiter = createRateLimiter({
  limit: 10,
  message: 'Terlalu banyak percobaan login, silakan coba lagi dalam 15 menit',
});

export const leadLimiter = createRateLimiter({
  limit: 5,
  message: 'Terlalu banyak pesan terkirim, silakan coba lagi dalam 15 menit',
});

export const trackingLimiter = createRateLimiter({
  limit: 30,
  message: 'Terlalu banyak permintaan cek resi, silakan coba lagi dalam 15 menit',
});
