import { CacheKeys } from '../../lib/cache.js';
import { createSortableService } from '../../lib/crud.js';

export const bannersService = createSortableService({
  model: 'banner',
  entity: 'Banner',
  label: 'Banner',
  publicSelect: {
    id: true,
    title: true,
    subtitle: true,
    image: true,
    ctaText: true,
    ctaLink: true,
    sortOrder: true,
  },
  cacheKeys: [CacheKeys.SITE],
});
