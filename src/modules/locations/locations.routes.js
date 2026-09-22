import { Router } from 'express';
import { publicCache } from '../../middlewares/cacheControl.js';
import { validate } from '../../middlewares/validate.js';
import { idParamSchema, reorderSchema } from '../../utils/commonSchemas.js';
import * as locationsController from './locations.controller.js';
import {
  createLocationSchema,
  listLocationsQuerySchema,
  publicLocationsQuerySchema,
  updateLocationSchema,
} from './locations.schema.js';

export const publicLocationsRouter = Router();
publicLocationsRouter.get(
  '/',
  publicCache,
  validate({ query: publicLocationsQuerySchema }),
  locationsController.listPublic,
);

export const adminLocationsRouter = Router();
adminLocationsRouter.get('/', validate({ query: listLocationsQuerySchema }), locationsController.list);
adminLocationsRouter.patch('/reorder', validate({ body: reorderSchema }), locationsController.reorder);
adminLocationsRouter.get('/:id', validate({ params: idParamSchema }), locationsController.getById);
adminLocationsRouter.post('/', validate({ body: createLocationSchema }), locationsController.create);
adminLocationsRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateLocationSchema }),
  locationsController.update,
);
adminLocationsRouter.delete('/:id', validate({ params: idParamSchema }), locationsController.remove);
