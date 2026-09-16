import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { formatZodIssues } from '../config/zod.js';
import { logger } from '../lib/logger.js';
import { AppError } from '../utils/AppError.js';
import { sendError } from '../utils/response.js';

const INTERNAL_ERROR = {
  statusCode: 500,
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Terjadi kesalahan pada server',
};

function fromPrismaError(err) {
  switch (err.code) {
    case 'P2002': {
      const target = err.meta?.target;
      const fields = Array.isArray(target) ? target : target ? [target] : [];
      return {
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Data dengan nilai tersebut sudah ada',
        details: fields.map((field) => ({ field, message: 'Nilai sudah digunakan' })),
      };
    }
    case 'P2025':
      return { statusCode: 404, code: 'NOT_FOUND', message: 'Data tidak ditemukan' };
    case 'P2003':
      return { statusCode: 400, code: 'BAD_REQUEST', message: 'Data relasi tidak valid' };
    default:
      return null;
  }
}

/** Map any thrown value to { statusCode, code, message, details? }. */
function normalizeError(err) {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      details: err.details,
    };
  }

  if (err instanceof ZodError) {
    return {
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      message: 'Data yang dikirim tidak valid',
      details: formatZodIssues(err.issues),
    };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = fromPrismaError(err);
    if (mapped) return mapped;
  }

  // Errors raised by express.json() (body-parser)
  if (err?.type === 'entity.parse.failed') {
    return { statusCode: 400, code: 'INVALID_JSON', message: 'Format JSON tidak valid' };
  }
  if (err?.type === 'entity.too.large') {
    return {
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Ukuran data yang dikirim terlalu besar',
    };
  }
  if (err?.expose && err.status >= 400 && err.status < 500) {
    return { statusCode: err.status, code: 'BAD_REQUEST', message: 'Permintaan tidak valid' };
  }

  return INTERNAL_ERROR;
}

// Express recognizes error handlers by their 4 parameters, keep `next`.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const error = normalizeError(err);
  const log = req.log ?? logger;

  if (error.statusCode >= 500) {
    log.error({ err }, 'Unhandled error');
  }

  // Show the original message only while developing locally.
  if (error === INTERNAL_ERROR && env.isDevelopment) {
    return sendError(res, {
      ...error,
      details: [{ message: err?.message ?? String(err) }],
    });
  }

  return sendError(res, error);
}
