import { actorFromRequest } from '../../lib/audit.js';
import { sendSuccess } from '../../utils/response.js';
import * as settingsService from './settings.service.js';

export async function getAll(req, res) {
  sendSuccess(res, await settingsService.getAllSettings());
}

export async function update(req, res) {
  const settings = await settingsService.updateSettings(actorFromRequest(req), req.validated.body);
  sendSuccess(res, settings, { message: 'Pengaturan berhasil disimpan' });
}
