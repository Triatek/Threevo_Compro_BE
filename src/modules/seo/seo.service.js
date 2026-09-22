import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { publishedArticleWhere } from '../articles/articles.filters.js';

/**
 * Frontend routes used in the sitemap.
 * Keep in sync with `src/routes/paths.js` in the frontend repository.
 */
export const FRONTEND_ROUTES = Object.freeze({
  staticPages: ['/', '/tentang-kami', '/layanan', '/harga', '/lokasi', '/berita', '/kontak'],
  service: (slug) => `/layanan/${slug}`,
  article: (slug) => `/berita/${slug}`,
});

/**
 * The pricing content is stored as a service but has its own page at /harga,
 * and the frontend redirects /layanan/paket-harga there. Listing both would
 * put duplicate content in the sitemap.
 */
const PRICING_SERVICE_SLUG = 'paket-harga';

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

function urlEntry(siteUrl, path, lastmod) {
  const loc = `<loc>${escapeXml(`${siteUrl}${path}`)}</loc>`;
  return `  <url>${loc}${lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ''}</url>`;
}

export async function buildSitemap({ siteUrl = env.SITE_URL } = {}) {
  const base = siteUrl.replace(/\/+$/, '');
  const [services, articles] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true, deletedAt: null, slug: { not: PRICING_SERVICE_SLUG } },
      select: { slug: true, updatedAt: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    }),
    prisma.article.findMany({
      where: publishedArticleWhere(),
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    }),
  ]);

  const entries = [
    ...FRONTEND_ROUTES.staticPages.map((path) => urlEntry(base, path)),
    ...services.map((s) => urlEntry(base, FRONTEND_ROUTES.service(s.slug), s.updatedAt)),
    ...articles.map((a) => urlEntry(base, FRONTEND_ROUTES.article(a.slug), a.updatedAt)),
  ];

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${entries.join('\n')}\n` +
    '</urlset>\n'
  );
}

/** Only production may be indexed; staging/dev block every crawler. */
export function buildRobotsTxt({ isProduction = env.isProduction, siteUrl = env.SITE_URL } = {}) {
  if (!isProduction) {
    return 'User-agent: *\nDisallow: /\n';
  }
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl.replace(/\/+$/, '')}/sitemap.xml\n`;
}
