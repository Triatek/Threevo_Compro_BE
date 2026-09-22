import { sendSuccess } from '../../utils/response.js';
import * as dashboardService from './dashboard.service.js';

export async function getDashboard(req, res) {
  sendSuccess(res, await dashboardService.getDashboard());
}
