import { AppError } from '../../utils/AppError.js';
import { sendSuccess } from '../../utils/response.js';
import * as healthService from './health.service.js';

export async function getHealth(req, res) {
  const { healthy, ...health } = await healthService.getHealthStatus();
  res.set('Cache-Control', 'no-store');

  if (!healthy) {
    throw new AppError('Layanan sedang tidak tersedia', {
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      details: [{ field: 'database', message: 'Database tidak dapat dihubungi' }],
    });
  }

  sendSuccess(res, health);
}
