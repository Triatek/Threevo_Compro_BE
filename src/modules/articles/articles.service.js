import { AuditAction, writeAuditLog } from '../../lib/audit.js';
import * as cache from '../../lib/cache.js';
import { prisma } from '../../lib/prisma.js';
import { sanitizeRichText } from '../../lib/sanitize.js';
import { resolveSlug } from '../../lib/uniqueSlug.js';
import { NotFoundError, ValidationError } from '../../utils/AppError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { publishedArticleWhere } from './articles.filters.js';

const ENTITY = 'Article';
const NOT_FOUND = 'Artikel tidak ditemukan';
const SLUG_MAX_LENGTH = 220;
const RELATED_LIMIT = 3;

const categorySelect = { select: { id: true, name: true, slug: true } };

const publicListSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  publishedAt: true,
  category: categorySelect,
  author: { select: { name: true } },
};

const publicDetailSelect = {
  ...publicListSelect,
  content: true,
  metaTitle: true,
  metaDescription: true,
  viewCount: true,
  updatedAt: true,
};

const adminInclude = {
  category: categorySelect,
  author: { select: { id: true, name: true } },
};

function invalidate() {
  cache.invalidate(cache.CacheKeys.ARTICLES, cache.CacheKeys.CATEGORIES);
}

function searchWhere(q) {
  return q
    ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { excerpt: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};
}

// ---------- Public ----------

export function listPublicArticles({ page, limit, category, q }) {
  const key = `${cache.CacheKeys.ARTICLES}list:${page}:${limit}:${category ?? ''}:${q?.toLowerCase() ?? ''}`;

  return cache.wrap(key, undefined, async () => {
    const where = {
      ...publishedArticleWhere(),
      ...(category && { category: { slug: category } }),
      ...searchWhere(q),
    };
    const [items, total] = await prisma.$transaction([
      prisma.article.findMany({
        where,
        select: publicListSelect,
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        ...getPagination({ page, limit }),
      }),
      prisma.article.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta({ page, limit, total }) };
  });
}

/** Published article + 3 related articles. Increments the view counter. */
export async function getPublicArticleBySlug(slug) {
  const article = await prisma.article.findFirst({
    where: { ...publishedArticleWhere(), slug },
    select: { ...publicDetailSelect, categoryId: true },
  });
  if (!article) throw new NotFoundError(NOT_FOUND);

  // Raw query so `updatedAt` (used as sitemap lastmod) is not touched.
  await prisma.$executeRaw`UPDATE articles SET view_count = view_count + 1 WHERE id = ${article.id}`;

  const related = article.categoryId
    ? await prisma.article.findMany({
        where: {
          ...publishedArticleWhere(),
          categoryId: article.categoryId,
          id: { not: article.id },
        },
        select: publicListSelect,
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: RELATED_LIMIT,
      })
    : [];

  const { categoryId, ...rest } = article;
  return { ...rest, viewCount: article.viewCount + 1, related };
}

// ---------- Admin ----------

export async function listArticles({ page, limit, status, category, categoryId, q }) {
  const where = {
    deletedAt: null,
    ...(status && { status }),
    ...(categoryId && { categoryId }),
    ...(category && { category: { slug: category } }),
    ...searchWhere(q),
  };

  const [items, total] = await prisma.$transaction([
    prisma.article.findMany({
      where,
      include: adminInclude,
      omit: { content: true, deletedAt: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      ...getPagination({ page, limit }),
    }),
    prisma.article.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}

async function findArticle(id) {
  const article = await prisma.article.findFirst({
    where: { id, deletedAt: null },
    include: adminInclude,
    omit: { deletedAt: true },
  });
  if (!article) throw new NotFoundError(NOT_FOUND);
  return article;
}

export const getArticleById = findArticle;

async function ensureCategoryExists(categoryId) {
  if (categoryId == null) return;
  const exists = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!exists) {
    throw new ValidationError(undefined, [
      { location: 'body', field: 'categoryId', message: 'Kategori tidak ditemukan' },
    ]);
  }
}

export async function createArticle(actor, { slug, content, ...data }) {
  await ensureCategoryExists(data.categoryId);

  const article = await prisma.article.create({
    data: {
      ...data,
      slug: await resolveSlug('article', {
        explicitSlug: slug,
        source: data.title,
        maxLength: SLUG_MAX_LENGTH,
      }),
      content: sanitizeRichText(content),
      // First publish without a date -> now.
      publishedAt: data.publishedAt ?? (data.status === 'PUBLISHED' ? new Date() : null),
      authorId: actor.userId,
    },
    include: adminInclude,
    omit: { deletedAt: true },
  });

  await writeAuditLog(actor, {
    action: AuditAction.CREATE,
    entity: ENTITY,
    entityId: article.id,
    metadata: { status: article.status },
  });
  invalidate();
  return article;
}

export async function updateArticle(actor, id, changes) {
  const { slug, content, ...data } = changes;
  const existing = await findArticle(id);
  if (data.categoryId !== undefined) await ensureCategoryExists(data.categoryId);

  const becomesPublished = data.status === 'PUBLISHED' && existing.status !== 'PUBLISHED';
  const needsPublishDate =
    (data.status ?? existing.status) === 'PUBLISHED' &&
    (data.publishedAt !== undefined ? data.publishedAt : existing.publishedAt) == null;

  const article = await prisma.article.update({
    where: { id },
    data: {
      ...data,
      ...(slug !== undefined && {
        slug: await resolveSlug('article', {
          explicitSlug: slug,
          excludeId: id,
          maxLength: SLUG_MAX_LENGTH,
        }),
      }),
      ...(content !== undefined && { content: sanitizeRichText(content) }),
      ...(needsPublishDate && { publishedAt: new Date() }),
    },
    include: adminInclude,
    omit: { deletedAt: true },
  });

  await writeAuditLog(actor, {
    action: becomesPublished ? AuditAction.PUBLISH : AuditAction.UPDATE,
    entity: ENTITY,
    entityId: id,
    metadata: { fields: Object.keys(changes) },
  });
  invalidate();
  return article;
}

export async function publishArticle(actor, id) {
  const existing = await findArticle(id);

  const article = await prisma.article.update({
    where: { id },
    data: { status: 'PUBLISHED', publishedAt: existing.publishedAt ?? new Date() },
    include: adminInclude,
    omit: { deletedAt: true },
  });

  await writeAuditLog(actor, { action: AuditAction.PUBLISH, entity: ENTITY, entityId: id });
  invalidate();
  return article;
}

export async function unpublishArticle(actor, id) {
  await findArticle(id);

  const article = await prisma.article.update({
    where: { id },
    data: { status: 'DRAFT' },
    include: adminInclude,
    omit: { deletedAt: true },
  });

  await writeAuditLog(actor, { action: AuditAction.UNPUBLISH, entity: ENTITY, entityId: id });
  invalidate();
  return article;
}

export async function deleteArticle(actor, id) {
  await findArticle(id);
  await prisma.article.update({ where: { id }, data: { deletedAt: new Date() } });

  await writeAuditLog(actor, { action: AuditAction.DELETE, entity: ENTITY, entityId: id });
  invalidate();
}
