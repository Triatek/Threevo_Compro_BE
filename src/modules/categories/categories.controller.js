import { actorFromRequest } from '../../lib/audit.js';
import { sendCreated, sendSuccess } from '../../utils/response.js';
import * as categoriesService from './categories.service.js';

export async function listPublic(req, res) {
  sendSuccess(res, await categoriesService.listPublicCategories());
}

export async function list(req, res) {
  sendSuccess(res, await categoriesService.listCategories());
}

export async function getById(req, res) {
  sendSuccess(res, await categoriesService.getCategoryById(req.validated.params.id));
}

export async function create(req, res) {
  const category = await categoriesService.createCategory(actorFromRequest(req), req.validated.body);
  sendCreated(res, category, { message: 'Kategori berhasil dibuat' });
}

export async function update(req, res) {
  const category = await categoriesService.updateCategory(
    actorFromRequest(req),
    req.validated.params.id,
    req.validated.body,
  );
  sendSuccess(res, category, { message: 'Kategori berhasil diperbarui' });
}

export async function remove(req, res) {
  await categoriesService.deleteCategory(actorFromRequest(req), req.validated.params.id);
  sendSuccess(res, null, { message: 'Kategori berhasil dihapus' });
}
