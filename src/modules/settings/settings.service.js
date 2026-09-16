import { AuditAction, writeAuditLog } from '../../lib/audit.js';
import * as cache from '../../lib/cache.js';
import { prisma } from '../../lib/prisma.js';
import { SETTING_DEFINITIONS, SETTING_KEYS } from './settings.schema.js';

const toObject = (rows) => Object.fromEntries(rows.map(({ key, value }) => [key, value]));

/** Public settings as `{ key: value }`. */
export async function getPublicSettings() {
  const rows = await prisma.setting.findMany({
    where: { isPublic: true, key: { in: SETTING_KEYS } },
    select: { key: true, value: true },
  });
  return toObject(rows);
}

/** Every known setting as `{ key: value }` (missing ones as ""). */
export async function getAllSettings() {
  const rows = await prisma.setting.findMany({ where: { key: { in: SETTING_KEYS } } });
  const stored = toObject(rows);
  return Object.fromEntries(SETTING_KEYS.map((key) => [key, stored[key] ?? '']));
}

export async function getSettingValue(key) {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? '';
}

export async function updateSettings(actor, values) {
  await prisma.$transaction(
    Object.entries(values).map(([key, value]) => {
      const { isPublic } = SETTING_DEFINITIONS[key];
      return prisma.setting.upsert({
        where: { key },
        update: { value, isPublic },
        create: { key, value, isPublic },
      });
    }),
  );

  await writeAuditLog(actor, {
    action: AuditAction.UPDATE,
    entity: 'Setting',
    metadata: { keys: Object.keys(values) },
  });
  cache.invalidate(cache.CacheKeys.SITE);

  return getAllSettings();
}
