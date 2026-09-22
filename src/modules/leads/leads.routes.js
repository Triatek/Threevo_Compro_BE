import { Router } from 'express';
import { requireRole } from '../../middlewares/auth.js';
import { noStore } from '../../middlewares/cacheControl.js';
import { leadLimiter } from '../../middlewares/rateLimiter.js';
import { validate } from '../../middlewares/validate.js';
import { idParamSchema } from '../../utils/commonSchemas.js';
import * as leadsController from './leads.controller.js';
import {
  createLeadQuerySchema,
  createLeadSchema,
  leadFiltersSchema,
  listLeadsQuerySchema,
  updateLeadSchema,
} from './leads.schema.js';

export const publicLeadsRouter = Router();
publicLeadsRouter.post(
  '/',
  noStore,
  leadLimiter,
  validate({ body: createLeadSchema, query: createLeadQuerySchema }),
  leadsController.create,
);

const byId = validate({ params: idParamSchema });

export const adminLeadsRouter = Router();
adminLeadsRouter.get('/', validate({ query: listLeadsQuerySchema }), leadsController.list);
// Must be registered before "/:id".
adminLeadsRouter.get('/export', validate({ query: leadFiltersSchema }), leadsController.exportCsv);
adminLeadsRouter.get('/:id', byId, leadsController.getById);
adminLeadsRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateLeadSchema }),
  leadsController.update,
);
adminLeadsRouter.delete('/:id', requireRole('SUPER_ADMIN'), byId, leadsController.remove);
