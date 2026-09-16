import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { buildRobotsTxt } from '../src/modules/seo/seo.service.js';
import { loginAs, prisma, request } from './helpers.js';

describe('GET /sitemap.xml', () => {
  beforeEach(async () => {
    await prisma.article.deleteMany();
    await prisma.service.deleteMany();
  });

  it('lists static pages, active services and published articles only', async () => {
    const now = new Date();
    await prisma.service.createMany({
      data: [
        { name: 'WMS', slug: 'wms' },
        { name: 'Off', slug: 'off', isActive: false },
        { name: 'Gone', slug: 'gone', deletedAt: now },
      ],
    });
    await prisma.article.createMany({
      data: [
        { title: 'Terbit', slug: 'terbit', content: 'x', status: 'PUBLISHED', publishedAt: new Date(now.getTime() - 1000) },
        { title: 'Draft', slug: 'draft', content: 'x' },
        { title: 'Nanti', slug: 'nanti', content: 'x', status: 'PUBLISHED', publishedAt: new Date(now.getTime() + 86_400_000) },
      ],
    });

    const res = await request().get('/sitemap.xml');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/xml');
    const xml = res.text;
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(xml).toContain('<loc>http://localhost:5173/</loc>');
    expect(xml).toMatch(/<loc>http:\/\/localhost:5173\/layanan\/wms<\/loc><lastmod>\d{4}-\d{2}-\d{2}T/);
    expect(xml).toContain('<loc>http://localhost:5173/berita/terbit</loc>');
    for (const hidden of ['off', 'gone', 'draft', 'nanti']) {
      expect(xml).not.toContain(`/${hidden}<`);
    }
  });
});

describe('robots.txt', () => {
  it('blocks crawlers outside production', async () => {
    const res = await request().get('/robots.txt');
    expect(res.status).toBe(200);
    expect(res.text).toBe('User-agent: *\nDisallow: /\n');
  });

  it('allows crawlers and points to the sitemap in production', () => {
    expect(buildRobotsTxt({ isProduction: true, siteUrl: 'https://threevo.id/' })).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://threevo.id/sitemap.xml\n',
    );
  });
});

describe('API docs', () => {
  it('serves Swagger UI and the JSON spec', async () => {
    const page = await request().get('/docs/');
    expect(page.status).toBe(200);
    expect(page.text).toContain('swagger-ui');

    const spec = await request().get('/docs/openapi.json');
    expect(spec.status).toBe(200);
    expect(spec.body.openapi).toBe('3.1.0');
  });

  it('documents only routes that exist', { timeout: 60_000 }, async () => {
    const doc = YAML.parse(readFileSync('docs/openapi.yaml', 'utf8'));
    const sample = { id: '1', slug: 'contoh', awb: 'TEST123456' };
    const methods = ['get', 'post', 'put', 'patch', 'delete'];
    const missing = [];

    for (const [pathTemplate, item] of Object.entries(doc.paths)) {
      const prefix = item.servers ? '' : '/api/v1';
      const url = prefix + pathTemplate.replace(/\{(\w+)\}/g, (_, name) => sample[name]);

      for (const method of methods.filter((m) => item[m])) {
        // Logged in as SUPER_ADMIN so unknown admin routes return 404 instead of 401.
        const { agent } = await loginAs('SUPER_ADMIN');
        const res = await agent[method](url).send({});
        const isUnknownRoute =
          res.status === 404 && res.body?.error?.message?.startsWith('Endpoint ');
        if (isUnknownRoute) missing.push(`${method.toUpperCase()} ${pathTemplate}`);
      }
    }

    expect(missing).toEqual([]);
    expect(Object.keys(doc.paths).length).toBeGreaterThanOrEqual(45);
  });
});
