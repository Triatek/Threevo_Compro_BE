import { Router } from 'express';
import { publicCache } from '../../middlewares/cacheControl.js';
import { validate } from '../../middlewares/validate.js';
import { idParamSchema, slugParamSchema } from '../../utils/commonSchemas.js';
import * as articlesController from './articles.controller.js';
import {
  createArticleSchema,
  listArticlesQuerySchema,
  publicArticlesQuerySchema,
  updateArticleSchema,
} from './articles.schema.js';

export const publicArticlesRouter = Router();
publicArticlesRouter.get(
  '/',
  publicCache,
  validate({ query: publicArticlesQuerySchema }),
  articlesController.listPublic,
);
publicArticlesRouter.get(
  '/:slug',
  validate({ params: slugParamSchema }),
  articlesController.getPublicBySlug,
);

const byId = validate({ params: idParamSchema });

export const adminArticlesRouter = Router();
adminArticlesRouter.get('/', validate({ query: listArticlesQuerySchema }), articlesController.list);
adminArticlesRouter.get('/:id', byId, articlesController.getById);
adminArticlesRouter.post('/', validate({ body: createArticleSchema }), articlesController.create);
adminArticlesRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateArticleSchema }),
  articlesController.update,
);
adminArticlesRouter.patch('/:id/publish', byId, articlesController.publish);
adminArticlesRouter.patch('/:id/unpublish', byId, articlesController.unpublish);
adminArticlesRouter.delete('/:id', byId, articlesController.remove);
