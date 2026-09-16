import { CacheKeys } from '../../lib/cache.js';
import { createSortableService } from '../../lib/crud.js';

export const clientsService = createSortableService({
  model: 'client',
  entity: 'Client',
  label: 'Klien',
  publicSelect: { id: true, name: true, logo: true, website: true, sortOrder: true },
  cacheKeys: [CacheKeys.SITE],
});
