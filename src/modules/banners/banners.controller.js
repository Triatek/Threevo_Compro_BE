import { createSortableController } from '../../lib/crud.js';
import { bannersService } from './banners.service.js';

export const bannersController = createSortableController(bannersService, { label: 'Banner' });
