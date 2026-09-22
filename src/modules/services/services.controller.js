import { actorFromRequest } from '../../lib/audit.js';
import { sendCreated, sendSuccess } from '../../utils/response.js';
import * as servicesService from './services.service.js';

// ---------- Public ----------

export async function listPublic(req, res) {
  sendSuccess(res, await servicesService.listPublicServices());
}

export async function getPublicBySlug(req, res) {
  sendSuccess(res, await servicesService.getPublicServiceBySlug(req.validated.params.slug));
}

// ---------- Admin ----------

export async function list(req, res) {
  const { items, meta } = await servicesService.listServices(req.validated.query);
  sendSuccess(res, items, { meta });
}

export async function getById(req, res) {
  sendSuccess(res, await servicesService.getServiceById(req.validated.params.id));
}

export async function create(req, res) {
  const service = await servicesService.createService(actorFromRequest(req), req.validated.body);
  sendCreated(res, service, { message: 'Layanan berhasil dibuat' });
}

export async function update(req, res) {
  const service = await servicesService.updateService(
    actorFromRequest(req),
    req.validated.params.id,
    req.validated.body,
  );
  sendSuccess(res, service, { message: 'Layanan berhasil diperbarui' });
}

export async function remove(req, res) {
  await servicesService.deleteService(actorFromRequest(req), req.validated.params.id);
  sendSuccess(res, null, { message: 'Layanan berhasil dihapus' });
}

export async function reorder(req, res) {
  await servicesService.reorderServices(actorFromRequest(req), req.validated.body);
  sendSuccess(res, null, { message: 'Urutan berhasil diperbarui' });
}
