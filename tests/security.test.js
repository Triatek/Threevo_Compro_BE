import { describe, expect, it } from 'vitest';
import { api, createUser, prisma, request } from './helpers.js';

describe('security headers & CORS', () => {
  it('allows the configured frontend origin with credentials', async () => {
    const res = await request().get(api('/health')).set('Origin', 'http://localhost:5173');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not grant CORS to unknown origins', async () => {
    const res = await request().get(api('/health')).set('Origin', 'https://evil.example');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers preflight requests only for allowed origins', async () => {
    const allowed = await request()
      .options(api('/auth/login'))
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');
    expect(allowed.status).toBe(204);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const denied = await request()
      .options(api('/auth/login'))
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sets helmet headers', async () => {
    const res = await request().get(api('/health'));

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});

describe('no sensitive data on public endpoints', () => {
  it('never exposes password hashes, emails of authors, IPs or private settings', async () => {
    const author = await createUser({ email: 'penulis-rahasia@test.local' });
    await prisma.article.create({
      data: {
        title: 'Publik',
        slug: 'publik-aman',
        content: '<p>x</p>',
        status: 'PUBLISHED',
        publishedAt: new Date(Date.now() - 1000),
        authorId: author.id,
      },
    });
    await prisma.setting.upsert({
      where: { key: 'lead_notification_email' },
      update: { value: 'internal@threevo.id', isPublic: false },
      create: { key: 'lead_notification_email', value: 'internal@threevo.id', isPublic: false },
    });

    const responses = await Promise.all([
      request().get(api('/site')),
      request().get(api('/articles')),
      request().get(api('/articles/publik-aman')),
      request().get(api('/categories')),
      request().get(api('/services')),
      request().get(api('/locations')),
    ]);

    for (const res of responses) {
      expect(res.status).toBe(200);
      const body = JSON.stringify(res.body);
      expect(body).not.toMatch(/passwordHash|password_hash|ipAddress|userAgent|deletedAt/);
      expect(body).not.toContain('penulis-rahasia@test.local');
      expect(body).not.toContain('internal@threevo.id');
    }
  });
});
