import { actorFromRequest } from '../../lib/audit.js';
import { sendCreated, sendSuccess } from '../../utils/response.js';
import * as locationsService from './locations.service.js';

// ---------- Public ----------

export async function listPublic(req, res) {
  sendSuccess(res, await locationsService.listPublicLocations(req.validated.query));
}

// ---------- Admin ----------

export async function list(req, res) {
  const { items, meta } = await locationsService.listLocations(req.validated.query);
  sendSuccess(res, items, { meta });
}

export async function getById(req, res) {
  sendSuccess(res, await locationsService.getLocationById(req.validated.params.id));
}

export async function create(req, res) {
  const location = await locationsService.createLocation(actorFromRequest(req), req.validated.body);
  sendCreated(res, location, { message: 'Lokasi berhasil dibuat' });
}

export async function update(req, res) {
  const location = await locationsService.updateLocation(
    actorFromRequest(req),
    req.validated.params.id,
    req.validated.body,
  );
  sendSuccess(res, location, { message: 'Lokasi berhasil diperbarui' });
}

export async function remove(req, res) {
  await locationsService.deleteLocation(actorFromRequest(req), req.validated.params.id);
  sendSuccess(res, null, { message: 'Lokasi berhasil dihapus' });
}

export async function reorder(req, res) {
  await locationsService.reorderLocations(actorFromRequest(req), req.validated.body);
  sendSuccess(res, null, { message: 'Urutan berhasil diperbarui' });
}
