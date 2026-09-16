import * as cache from '../../lib/cache.js';
import { prisma } from '../../lib/prisma.js';
import { bannersService } from '../banners/banners.service.js';
import { clientsService } from '../clients/clients.service.js';
import { getPublicSettings } from '../settings/settings.service.js';
import { testimonialsService } from '../testimonials/testimonials.service.js';

function listFeaturedServices() {
  return prisma.service.findMany({
    where: { isActive: true, isFeatured: true, deletedAt: null },
    select: { id: true, name: true, slug: true, shortDesc: true, icon: true, image: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
}

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
