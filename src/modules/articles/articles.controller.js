import { actorFromRequest } from '../../lib/audit.js';
import { sendCreated, sendSuccess } from '../../utils/response.js';
import * as articlesService from './articles.service.js';

// ---------- Public ----------

export async function listPublic(req, res) {
  const { items, meta } = await articlesService.listPublicArticles(req.validated.query);
  sendSuccess(res, items, { meta });
}

export async function getPublicBySlug(req, res) {
  // Not cached by browsers/CDN because every view is counted.
  res.set('Cache-Control', 'no-cache');
  sendSuccess(res, await articlesService.getPublicArticleBySlug(req.validated.params.slug));
}

// ---------- Admin ----------

export async function list(req, res) {
  const { items, meta } = await articlesService.listArticles(req.validated.query);
  sendSuccess(res, items, { meta });
}

export async function getById(req, res) {
  sendSuccess(res, await articlesService.getArticleById(req.validated.params.id));
}

export async function create(req, res) {
  const article = await articlesService.createArticle(actorFromRequest(req), req.validated.body);
  sendCreated(res, article, { message: 'Artikel berhasil dibuat' });
}

export async function update(req, res) {
  const article = await articlesService.updateArticle(
    actorFromRequest(req),
    req.validated.params.id,
    req.validated.body,
  );
  sendSuccess(res, article, { message: 'Artikel berhasil diperbarui' });
}

export async function publish(req, res) {
  const article = await articlesService.publishArticle(actorFromRequest(req), req.validated.params.id);
  sendSuccess(res, article, { message: 'Artikel berhasil dipublikasikan' });
}

export async function unpublish(req, res) {
  const article = await articlesService.unpublishArticle(
    actorFromRequest(req),
    req.validated.params.id,
  );
  sendSuccess(res, article, { message: 'Artikel dikembalikan ke draft' });
}

export async function remove(req, res) {
  await articlesService.deleteArticle(actorFromRequest(req), req.validated.params.id);
  sendSuccess(res, null, { message: 'Artikel berhasil dihapus' });
}
