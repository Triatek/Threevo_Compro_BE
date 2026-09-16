import { sendSuccess } from '../../utils/response.js';
import * as siteService from './site.service.js';

export async function getSite(req, res) {
  sendSuccess(res, await siteService.getSite());
}
