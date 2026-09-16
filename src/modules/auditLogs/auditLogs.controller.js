import { sendSuccess } from '../../utils/response.js';
import * as auditLogsService from './auditLogs.service.js';

export async function list(req, res) {
  const { items, meta } = await auditLogsService.listAuditLogs(req.validated.query);
  sendSuccess(res, items, { meta });
}
