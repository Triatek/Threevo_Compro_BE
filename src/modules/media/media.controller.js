import { actorFromRequest } from '../../lib/audit.js';
import { sendCreated, sendSuccess } from '../../utils/response.js';
import * as mediaService from './media.service.js';

export async function upload(req, res) {
  const media = await mediaService.uploadMedia(
    actorFromRequest(req),
    req.file,
    req.validated.body,
  );
  sendCreated(res, media, { message: 'Gambar berhasil diunggah' });
}

export async function list(req, res) {
  const { items, meta } = await mediaService.listMedia(req.validated.query);
  sendSuccess(res, items, { meta });
}

export async function remove(req, res) {
  await mediaService.deleteMedia(actorFromRequest(req), req.validated.params.id);
  sendSuccess(res, null, { message: 'Media berhasil dihapus' });
}
