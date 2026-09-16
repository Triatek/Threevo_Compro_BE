import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getActiveUserById } from '../modules/auth/auth.service.js';
import { ForbiddenError, UnauthorizedError } from '../utils/AppError.js';

export const ACCESS_TOKEN_COOKIE = 'access_token';

function extractToken(req) {
  const fromCookie = req.cookies?.[ACCESS_TOKEN_COOKIE];
  if (fromCookie) return fromCookie;

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/**
 * Require a valid access token (cookie `access_token`, fallback `Authorization: Bearer`).
 * Loads the active user into `req.user`.
 */
export async function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) throw new UnauthorizedError();

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    throw new UnauthorizedError(
      err instanceof jwt.TokenExpiredError
        ? 'Sesi telah berakhir, silakan perbarui sesi atau login kembali'
        : 'Token tidak valid',
    );
  }

  const user = await getActiveUserById(Number(payload.sub));
  if (!user) throw new UnauthorizedError('Akun tidak ditemukan atau tidak aktif');

  req.user = user;
  next();
}

/** Allow only the given roles. Use after requireAuth. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) throw new UnauthorizedError();
    if (!roles.includes(req.user.role)) throw new ForbiddenError();
    next();
  };
}
