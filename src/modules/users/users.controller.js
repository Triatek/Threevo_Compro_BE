import { actorFromRequest } from '../../lib/audit.js';
import { sendCreated, sendSuccess } from '../../utils/response.js';
import * as usersService from './users.service.js';

export async function list(req, res) {
  const { items, meta } = await usersService.listUsers(req.validated.query);
  sendSuccess(res, items, { meta });
}

export async function getById(req, res) {
  sendSuccess(res, await usersService.getUserById(req.validated.params.id));
}

export async function create(req, res) {
  const user = await usersService.createUser(actorFromRequest(req), req.validated.body);
  sendCreated(res, user, { message: 'User berhasil dibuat' });
}

export async function update(req, res) {
  const user = await usersService.updateUser(
    actorFromRequest(req),
    req.validated.params.id,
    req.validated.body,
  );
  sendSuccess(res, user, { message: 'User berhasil diperbarui' });
}

export async function remove(req, res) {
  const user = await usersService.deactivateUser(actorFromRequest(req), req.validated.params.id);
  sendSuccess(res, user, { message: 'User berhasil dinonaktifkan' });
}
