import * as cache from '../../lib/cache.js';
import { bannersService } from '../banners/banners.service.js';
import { clientsService } from '../clients/clients.service.js';
import { listFeaturedServices } from '../services/services.service.js';
import { getPublicSettings } from '../settings/settings.service.js';
import { testimonialsService } from '../testimonials/testimonials.service.js';

/** Everything the Home page / layout needs in one request. */
export function getSite() {
  return cache.wrap(cache.CacheKeys.SITE, undefined, async () => {
    const [settings, banners, clients, testimonials, services] = await Promise.all([
      getPublicSettings(),
      bannersService.listActive(),
      clientsService.listActive(),
      testimonialsService.listActive(),
      listFeaturedServices(),
    ]);
    return { settings, banners, clients, testimonials, services };
  });
}
