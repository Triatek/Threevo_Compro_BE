import { Router } from 'express';
import { publicCache } from '../../middlewares/cacheControl.js';
import { validate } from '../../middlewares/validate.js';
import { idParamSchema } from '../../utils/commonSchemas.js';
import * as categoriesController from './categories.controller.js';
import { createCategorySchema, updateCategorySchema } from './categories.schema.js';

export const publicCategoriesRouter = Router();
publicCategoriesRouter.get('/', publicCache, categoriesController.listPublic);

export const adminCategoriesRouter = Router();
adminCategoriesRouter.get('/', categoriesController.list);
adminCategoriesRouter.get('/:id', validate({ params: idParamSchema }), categoriesController.getById);
adminCategoriesRouter.post('/', validate({ body: createCategorySchema }), categoriesController.create);
adminCategoriesRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateCategorySchema }),
  categoriesController.update,
);
adminCategoriesRouter.delete('/:id', validate({ params: idParamSchema }), categoriesController.remove);
