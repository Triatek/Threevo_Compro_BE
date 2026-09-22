import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AuditAction, writeAuditLog } from '../../lib/audit.js';
import { logger } from '../../lib/logger.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import { UnauthorizedError, ValidationError } from '../../utils/AppError.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const INVALID_CREDENTIALS = 'Email atau password salah';
const INVALID_SESSION = 'Sesi tidak valid, silakan login kembali';

/** Fields that are safe to return to the client. */
export const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
};

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function getActiveUserById(id) {
  if (!Number.isInteger(id)) return null;
  return prisma.user.findFirst({ where: { id, isActive: true }, select: safeUserSelect });
}

function signAccessToken(user) {
  return jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
    subject: String(user.id),
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

async function createRefreshToken(db, userId, meta) {
  const token = randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * DAY_MS);

  await db.refreshToken.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
      ipAddress: meta.ipAddress ?? null,
    },
  });
  return { token, expiresAt };
}

export function revokeAllUserTokens(db, userId, { exceptTokenHash } = {}) {
  return db.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptTokenHash && { tokenHash: { not: exceptTokenHash } }),
    },
    data: { revokedAt: new Date() },
  });
}

/**
 * @param {{ email: string, password: string }} credentials
 * @param {{ userAgent?: string, ipAddress: string|null }} meta
 */
export async function login({ email, password }, meta) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always run bcrypt so response time does not reveal whether the email exists.
  const passwordValid = await verifyPassword(password, user?.passwordHash);
  if (!user || !passwordValid || !user.isActive) {
    throw new UnauthorizedError(INVALID_CREDENTIALS);
  }

  const { token: refreshToken, expiresAt } = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return createRefreshToken(tx, user.id, meta);
  });

  await writeAuditLog(
    { userId: user.id, ipAddress: meta.ipAddress },
    { action: AuditAction.LOGIN, entity: 'User', entityId: user.id },
  );

  return {
    user: await getActiveUserById(user.id),
    accessToken: signAccessToken(user),
    refreshToken,
    refreshTokenExpiresAt: expiresAt,
  };
}

/**
 * Rotate a refresh token. Reusing a revoked token revokes every session of the user
 * (the token was probably stolen).
 */
export async function refresh(rawToken, meta) {
  if (!rawToken) throw new UnauthorizedError(INVALID_SESSION);

  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored) throw new UnauthorizedError(INVALID_SESSION);

  if (stored.revokedAt) {
    await revokeAllUserTokens(prisma, stored.userId);
    logger.warn({ userId: stored.userId }, 'Refresh token reuse detected, all sessions revoked');
    await writeAuditLog(
      { userId: stored.userId, ipAddress: meta.ipAddress },
      { action: AuditAction.TOKEN_REUSE, entity: 'User', entityId: stored.userId },
    );
    throw new UnauthorizedError(INVALID_SESSION);
  }

  if (stored.expiresAt <= new Date() || !stored.user.isActive) {
    throw new UnauthorizedError(INVALID_SESSION);
  }

  const result = await prisma.$transaction(async (tx) => {
    // Conditional update: if a concurrent request already rotated this token,
    // count is 0 and we treat it as reuse.
    const { count } = await tx.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) return null;
    return createRefreshToken(tx, stored.userId, meta);
  });

  if (!result) {
    await revokeAllUserTokens(prisma, stored.userId);
    throw new UnauthorizedError(INVALID_SESSION);
  }

  return {
    user: await getActiveUserById(stored.userId),
    accessToken: signAccessToken(stored.user),
    refreshToken: result.token,
    refreshTokenExpiresAt: result.expiresAt,
  };
}

export async function logout(rawToken, meta) {
  if (!rawToken) return;

  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.revokedAt) return;

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  await writeAuditLog(
    { userId: stored.userId, ipAddress: meta.ipAddress },
    { action: AuditAction.LOGOUT, entity: 'User', entityId: stored.userId },
  );
}

/**
 * Change own password and revoke every other session.
 * @param {string|undefined} currentRefreshToken token of the session that stays logged in
 */
export async function changePassword(actor, { currentPassword, newPassword }, currentRefreshToken) {
  const user = await prisma.user.findUnique({ where: { id: actor.userId } });
  const valid = await verifyPassword(currentPassword, user?.passwordHash);
  if (!user || !valid) {
    // 422 instead of 401 so the frontend does not treat it as an expired session.
    throw new ValidationError(undefined, [
      { location: 'body', field: 'currentPassword', message: 'Password lama salah' },
    ]);
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    revokeAllUserTokens(prisma, user.id, {
      exceptTokenHash: currentRefreshToken ? hashToken(currentRefreshToken) : undefined,
    }),
  ]);

  await writeAuditLog(actor, {
    action: AuditAction.CHANGE_PASSWORD,
    entity: 'User',
    entityId: user.id,
  });
}
