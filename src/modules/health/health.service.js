import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

/** @returns {Promise<boolean>} true when the database answers `SELECT 1` */
export async function isDatabaseUp() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    logger.error({ err }, 'Database health check failed');
    return false;
  }
}

export async function getHealthStatus() {
  const databaseUp = await isDatabaseUp();
  return {
    healthy: databaseUp,
    status: databaseUp ? 'OK' : 'DEGRADED',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    services: { database: databaseUp ? 'up' : 'down' },
  };
}
