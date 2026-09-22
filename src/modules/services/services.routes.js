import { Router } from 'express';
import { publicCache } from '../../middlewares/cacheControl.js';
import { validate } from '../../middlewares/validate.js';
import { idParamSchema, reorderSchema, slugParamSchema } from '../../utils/commonSchemas.js';
import * as servicesController from './services.controller.js';
import {
  createServiceSchema,
  listServicesQuerySchema,
  updateServiceSchema,
} from './services.schema.js';

export const publicServicesRouter = Router();
publicServicesRouter.use(publicCache);
publicServicesRouter.get('/', servicesController.listPublic);
publicServicesRouter.get(
  '/:slug',
  validate({ params: slugParamSchema }),
  servicesController.getPublicBySlug,
);

export const adminServicesRouter = Router();
adminServicesRouter.get('/', validate({ query: listServicesQuerySchema }), servicesController.list);
adminServicesRouter.patch('/reorder', validate({ body: reorderSchema }), servicesController.reorder);
adminServicesRouter.get('/:id', validate({ params: idParamSchema }), servicesController.getById);
adminServicesRouter.post('/', validate({ body: createServiceSchema }), servicesController.create);
adminServicesRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateServiceSchema }),
  servicesController.update,
);
adminServicesRouter.delete('/:id', validate({ params: idParamSchema }), servicesController.remove);
