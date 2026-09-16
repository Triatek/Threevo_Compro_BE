import { AuditAction, writeAuditLog } from '../../lib/audit.js';
import * as cache from '../../lib/cache.js';
import { reorderItems, sortOrderBy } from '../../lib/crud.js';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ValidationError } from '../../utils/AppError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const ENTITY = 'Location';
const NOT_FOUND = 'Lokasi tidak ditemukan';

const publicSelect = {
  id: true,
  name: true,
  type: true,
  address: true,
  city: true,
  province: true,
  latitude: true,
  longitude: true,
  phone: true,
  mapsUrl: true,
};

/** Prisma returns Decimal objects (serialized as strings); maps need numbers. */
function toDto(location) {
  return {
    ...location,
    latitude: location.latitude == null ? null : Number(location.latitude),
    longitude: location.longitude == null ? null : Number(location.longitude),
  };
}

function buildFilters({ city, type }) {
  return {
    ...(city && { city: { equals: city, mode: 'insensitive' } }),
    ...(type && { type }),
  };
}

function invalidate() {
  cache.invalidate(cache.CacheKeys.LOCATIONS);
}

// ---------- Public ----------

export function listPublicLocations({ city, type }) {
  const key = `${cache.CacheKeys.LOCATIONS}list:${type ?? ''}:${city?.toLowerCase() ?? ''}`;
  return cache.wrap(key, undefined, async () => {
    const locations = await prisma.location.findMany({
      where: { isActive: true, ...buildFilters({ city, type }) },
      select: publicSelect,
      orderBy: sortOrderBy,
    });
    return locations.map(toDto);
  });
}

// ---------- Admin ----------

export async function listLocations({ page, limit, q, city, type, isActive }) {
  const where = {
    ...buildFilters({ city, type }),
    ...(isActive !== undefined && { isActive }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ],
    }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.location.findMany({ where, orderBy: sortOrderBy, ...getPagination({ page, limit }) }),
    prisma.location.count({ where }),
  ]);
  return { items: items.map(toDto), meta: buildPaginationMeta({ page, limit, total }) };
}

async function findLocation(id) {
  const location = await prisma.location.findUnique({ where: { id } });
  if (!location) throw new NotFoundError(NOT_FOUND);
  return location;
}

export async function getLocationById(id) {
  return toDto(await findLocation(id));
}

export async function createLocation(actor, data) {
  const location = await prisma.location.create({ data });
  await writeAuditLog(actor, { action: AuditAction.CREATE, entity: ENTITY, entityId: location.id });
  invalidate();
  return toDto(location);
}

export async function updateLocation(actor, id, data) {
  const existing = await findLocation(id);

  const latitude = data.latitude !== undefined ? data.latitude : existing.latitude;
  const longitude = data.longitude !== undefined ? data.longitude : existing.longitude;
  if ((latitude == null) !== (longitude == null)) {
    throw new ValidationError(undefined, [
      { field: 'longitude', message: 'Latitude dan longitude harus diisi bersamaan' },
    ]);
  }

  const location = await prisma.location.update({ where: { id }, data });
  await writeAuditLog(actor, {
    action: AuditAction.UPDATE,
    entity: ENTITY,
    entityId: id,
    metadata: { fields: Object.keys(data) },
  });
  invalidate();
  return toDto(location);
}

export async function deleteLocation(actor, id) {
  await findLocation(id);
  await prisma.location.delete({ where: { id } });
  await writeAuditLog(actor, { action: AuditAction.DELETE, entity: ENTITY, entityId: id });
  invalidate();
}

export async function reorderLocations(actor, items) {
  await reorderItems('location', items);
  await writeAuditLog(actor, { action: AuditAction.REORDER, entity: ENTITY, metadata: { items } });
  invalidate();
}
