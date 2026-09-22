import { sendSuccess } from '../../utils/response.js';
import * as trackingService from './tracking.service.js';

export async function track(req, res) {
  sendSuccess(res, await trackingService.trackShipment(req.validated.params.awb));
}
