import { createSortableRouter } from '../../lib/crud.js';
import { bannersController } from './banners.controller.js';
import { createBannerSchema, updateBannerSchema } from './banners.schema.js';

export default createSortableRouter(bannersController, {
  createSchema: createBannerSchema,
  updateSchema: updateBannerSchema,
});
