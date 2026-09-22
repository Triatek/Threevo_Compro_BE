import { Router } from 'express';
import { requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import * as auditLogsController from './auditLogs.controller.js';
import { listAuditLogsQuerySchema } from './auditLogs.schema.js';

const router = Router();

router.get(
  '/',
  requireRole('SUPER_ADMIN'),
  validate({ query: listAuditLogsQuerySchema }),
  auditLogsController.list,
);

export default router;
