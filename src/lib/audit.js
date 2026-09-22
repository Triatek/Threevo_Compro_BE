import { logger } from './logger.js';
import { prisma } from './prisma.js';

export const AuditAction = Object.freeze({
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD',
  TOKEN_REUSE: 'TOKEN_REUSE',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  PUBLISH: 'PUBLISH',
  UNPUBLISH: 'UNPUBLISH',
  REORDER: 'REORDER',
  EXPORT: 'EXPORT',
});

/**
 * Who performs an action. Built in controllers so services stay HTTP-agnostic.
 * @param {import('express').Request} req
 */
export function actorFromRequest(req) {
  return {
    userId: req.user?.id ?? null,
    ipAddress: req.ip ? req.ip.slice(0, 45) : null,
  };
}

/**
 * Write an audit log entry. Failures are logged but never break the main action.
 * @param {{ userId: number|null, ipAddress: string|null }} actor
 * @param {{ action: string, entity: string, entityId?: string|number, metadata?: object }} entry
 */
export async function writeAuditLog(actor, { action, entity, entityId, metadata }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: actor?.userId ?? null,
        ipAddress: actor?.ipAddress ?? null,
        action,
        entity,
        entityId: entityId == null ? null : String(entityId),
        metadata,
      },
    });
  } catch (err) {
    logger.error({ err, action, entity, entityId }, 'Failed to write audit log');
  }
}
