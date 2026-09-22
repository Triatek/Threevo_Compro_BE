/**
 * Shared Prisma filters for articles.
 * Published = status PUBLISHED, not soft-deleted, and publishedAt already reached
 * (a future publishedAt schedules the article).
 */
export function publishedArticleWhere(now = new Date()) {
  return {
    status: 'PUBLISHED',
    deletedAt: null,
    publishedAt: { lte: now },
  };
}
