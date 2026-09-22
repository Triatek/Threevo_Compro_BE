import * as seoService from './seo.service.js';

export async function sitemap(req, res) {
  const xml = await seoService.buildSitemap();
  res
    .type('application/xml')
    .set('Cache-Control', 'public, max-age=3600')
    .send(xml);
}

export function robots(req, res) {
  res
    .type('text/plain')
    .set('Cache-Control', 'public, max-age=3600')
    .send(seoService.buildRobotsTxt());
}
