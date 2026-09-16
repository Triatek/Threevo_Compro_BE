import { AuditAction, writeAuditLog } from '../../lib/audit.js';
import * as cache from '../../lib/cache.js';
import { reorderItems, sortOrderBy } from '../../lib/crud.js';
import { prisma } from '../../lib/prisma.js';
import { sanitizeRichText } from '../../lib/sanitize.js';
import { resolveSlug } from '../../lib/uniqueSlug.js';
import { NotFoundError } from '../../utils/AppError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const ENTITY = 'Service';
const NOT_FOUND = 'Layanan tidak ditemukan';
const SLUG_MAX_LENGTH = 170;

const publicListSelect = {
  id: true,
  name: true,
  slug: true,
  shortDesc: true,
  icon: true,
  image: true,
  isFeatured: true,
  sortOrder: true,
};

const publicDetailSelect = {
  ...publicListSelect,
  content: true,
  metaTitle: true,
  metaDescription: true,
  updatedAt: true,
};

const publicWhere = { isActive: true, deletedAt: null };

function invalidate() {
  cache.invalidate(cache.CacheKeys.SERVICES, cache.CacheKeys.SITE);
}

// ---------- Public ----------

export function listPublicServices() {
  return cache.wrap(`${cache.CacheKeys.SERVICES}list`, undefined, () =>
    prisma.service.findMany({ where: publicWhere, select: publicListSelect, orderBy: sortOrderBy }),
  );
}

export function listFeaturedServices() {
  return prisma.service.findMany({
    where: { ...publicWhere, isFeatured: true },
    select: { id: true, name: true, slug: true, shortDesc: true, icon: true, image: true },
    orderBy: sortOrderBy,
  });
}

export function getPublicServiceBySlug(slug) {
  return cache.wrap(`${cache.CacheKeys.SERVICES}detail:${slug}`, undefined, async () => {
    const service = await prisma.service.findFirst({
      where: { ...publicWhere, slug },
      select: publicDetailSelect,
    });
    if (!service) throw new NotFoundError(NOT_FOUND);
    return service;
  });
}

// ---------- Admin ----------

export async function listServices({ page, limit, q, isActive, isFeatured }) {
  const where = {
    deletedAt: null,
    ...(isActive !== undefined && { isActive }),
    ...(isFeatured !== undefined && { isFeatured }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { shortDesc: { contains: q, mode: 'insensitive' } },
      ],
    }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.service.findMany({
      where,
      omit: { content: true, deletedAt: true },
      orderBy: sortOrderBy,
      ...getPagination({ page, limit }),
    }),
    prisma.service.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}

export async function getServiceById(id) {
  const service = await prisma.service.findFirst({
    where: { id, deletedAt: null },
    omit: { deletedAt: true },
  });
  if (!service) throw new NotFoundError(NOT_FOUND);
  return service;
}

export async function createService(actor, { slug, content, ...data }) {
  const service = await prisma.service.create({
    data: {
      ...data,
      slug: await resolveSlug('service', {
        explicitSlug: slug,
        source: data.name,
        maxLength: SLUG_MAX_LENGTH,
      }),
      content: sanitizeRichText(content),
    },
    omit: { deletedAt: true },
  });

  await writeAuditLog(actor, { action: AuditAction.CREATE, entity: ENTITY, entityId: service.id });
  invalidate();
  return service;
}

export async function updateService(actor, id, changes) {
  const { slug, content, ...data } = changes;
  await getServiceById(id);

  const service = await prisma.service.update({
    where: { id },
    data: {
      ...data,
      // The slug only changes when explicitly sent, so existing URLs keep working.
      ...(slug !== undefined && {
        slug: await resolveSlug('service', {
          explicitSlug: slug,
          excludeId: id,
          maxLength: SLUG_MAX_LENGTH,
        }),
      }),
      ...(content !== undefined && { content: sanitizeRichText(content) }),
    },
    omit: { deletedAt: true },
  });

  await writeAuditLog(actor, {
    action: AuditAction.UPDATE,
    entity: ENTITY,
    entityId: id,
    metadata: { fields: Object.keys(changes) },
  });
  invalidate();
  return service;
}

export async function deleteService(actor, id) {
  await getServiceById(id);
  await prisma.service.update({ where: { id }, data: { deletedAt: new Date() } });

  await writeAuditLog(actor, { action: AuditAction.DELETE, entity: ENTITY, entityId: id });
  invalidate();
}

export async function reorderServices(actor, items) {
  await reorderItems('service', items);
  await writeAuditLog(actor, { action: AuditAction.REORDER, entity: ENTITY, metadata: { items } });
  invalidate();
}
