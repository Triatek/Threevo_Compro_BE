import { AuditAction, writeAuditLog } from '../../lib/audit.js';
import * as cache from '../../lib/cache.js';
import { prisma } from '../../lib/prisma.js';
import { resolveSlug } from '../../lib/uniqueSlug.js';
import { ConflictError, NotFoundError } from '../../utils/AppError.js';
import { publishedArticleWhere } from '../articles/articles.filters.js';

const ENTITY = 'Category';
const NOT_FOUND = 'Kategori tidak ditemukan';
const SLUG_MAX_LENGTH = 120;

function invalidate() {
  // Article lists embed category names.
  cache.invalidate(cache.CacheKeys.CATEGORIES, cache.CacheKeys.ARTICLES);
}

const withCount = ({ _count, ...category }) => ({ ...category, articleCount: _count.articles });

/** Public: all categories with the number of published articles. */
export function listPublicCategories() {
  return cache.wrap(cache.CacheKeys.CATEGORIES, undefined, async () => {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { articles: { where: publishedArticleWhere() } } },
      },
      orderBy: { name: 'asc' },
    });
    return categories.map(withCount);
  });
}

/** Admin: all categories with the number of (non-deleted) articles of any status. */
export async function listCategories() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { articles: { where: { deletedAt: null } } } } },
    orderBy: { name: 'asc' },
  });
  return categories.map(withCount);
}

export async function getCategoryById(id) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { articles: { where: { deletedAt: null } } } } },
  });
  if (!category) throw new NotFoundError(NOT_FOUND);
  return withCount(category);
}

export async function createCategory(actor, { name, slug }) {
  const category = await prisma.category.create({
    data: {
      name,
      slug: await resolveSlug('category', {
        explicitSlug: slug,
        source: name,
        maxLength: SLUG_MAX_LENGTH,
      }),
    },
  });
  await writeAuditLog(actor, { action: AuditAction.CREATE, entity: ENTITY, entityId: category.id });
  invalidate();
  return category;
}

export async function updateCategory(actor, id, changes) {
  const { slug, ...data } = changes;
  await getCategoryById(id);

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...data,
      ...(slug !== undefined && {
        slug: await resolveSlug('category', {
          explicitSlug: slug,
          excludeId: id,
          maxLength: SLUG_MAX_LENGTH,
        }),
      }),
    },
  });
  await writeAuditLog(actor, {
    action: AuditAction.UPDATE,
    entity: ENTITY,
    entityId: id,
    metadata: { fields: Object.keys(changes) },
  });
  invalidate();
  return category;
}

export async function deleteCategory(actor, id) {
  const category = await getCategoryById(id);
  if (category.articleCount > 0) {
    throw new ConflictError(
      `Kategori masih dipakai oleh ${category.articleCount} artikel. Pindahkan artikel terlebih dahulu.`,
    );
  }

  await prisma.category.delete({ where: { id } });
  await writeAuditLog(actor, { action: AuditAction.DELETE, entity: ENTITY, entityId: id });
  invalidate();
}
