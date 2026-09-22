import { CacheKeys } from '../../lib/cache.js';
import { createSortableService } from '../../lib/crud.js';

export const testimonialsService = createSortableService({
  model: 'testimonial',
  entity: 'Testimonial',
  label: 'Testimoni',
  publicSelect: {
    id: true,
    name: true,
    position: true,
    company: true,
    message: true,
    photo: true,
    sortOrder: true,
  },
  cacheKeys: [CacheKeys.SITE],
});
