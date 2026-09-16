import { NotFoundError } from '../utils/AppError.js';

export function notFound(req, res, next) {
  next(new NotFoundError(`Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`));
}
