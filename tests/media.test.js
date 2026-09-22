import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { UPLOAD_ROOT } from '../src/lib/storage.js';
import { api, loginAs, prisma, request } from './helpers.js';

const pngImage = (width = 64, height = 32) =>
  sharp({ create: { width, height, channels: 3, background: '#ff6600' } }).png().toBuffer();

const pathnameOf = (url) => new URL(url).pathname;

afterAll(async () => {
  await rm(UPLOAD_ROOT, { recursive: true, force: true });
});

describe('/admin/media', () => {
  it('uploads an image, converts it to WebP, resizes it and serves it from /uploads', async () => {
    const { agent, user } = await loginAs('EDITOR');

    const res = await agent
      .post(api('/admin/media'))
      .field('alt', 'Gudang kami')
      .attach('file', await pngImage(2400, 100), { filename: 'gudang.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      originalName: 'gudang.png',
      mimeType: 'image/webp',
      width: 1920,
      height: 80,
      alt: 'Gudang kami',
      uploadedBy: { id: user.id },
    });
    expect(res.body.data.filename).toMatch(/^\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/);
    expect(res.body.data.url).toMatch(/^http:\/\/localhost:4001\/uploads\//);
    expect(existsSync(path.join(UPLOAD_ROOT, res.body.data.filename))).toBe(true);

    const file = await request().get(pathnameOf(res.body.data.url));
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('image/webp');
    expect(file.headers['cache-control']).toContain('immutable');
    expect(file.headers['cross-origin-resource-policy']).toBe('cross-origin');

    const metadata = await sharp(file.body).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.exif).toBeUndefined();

    expect(await prisma.auditLog.count({ where: { entity: 'Media', action: 'CREATE' } })).toBe(1);
  });

  it('does not enlarge small images', async () => {
    const { agent } = await loginAs('EDITOR');
    const res = await agent
      .post(api('/admin/media'))
      .attach('file', await pngImage(64, 32), { filename: 'kecil.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ width: 64, height: 32 });
  });

  it('rejects non-image content even with an image extension and mimetype', async () => {
    const { agent } = await loginAs('EDITOR');

    const fake = await agent
      .post(api('/admin/media'))
      .attach('file', Buffer.from('<?php echo "hacked"; ?>'), {
        filename: 'shell.png',
        contentType: 'image/png',
      });
    expect(fake.status).toBe(400);

    const gif = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#000' } })
      .gif()
      .toBuffer();
    const disguisedGif = await agent
      .post(api('/admin/media'))
      .attach('file', gif, { filename: 'anim.jpg', contentType: 'image/jpeg' });
    expect(disguisedGif.status).toBe(400);

    expect(await prisma.media.count({ where: { originalName: { in: ['shell.png', 'anim.jpg'] } } })).toBe(0);
  });

  it('rejects SVG, missing file, wrong field name and oversized files', async () => {
    const { agent } = await loginAs('EDITOR');

    const svg = await agent
      .post(api('/admin/media'))
      .attach('file', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), {
        filename: 'logo.svg',
        contentType: 'image/svg+xml',
      });
    expect(svg.status).toBe(400);

    const missing = await agent.post(api('/admin/media')).field('alt', 'tanpa file');
    expect(missing.status).toBe(422);

    const wrongField = await agent
      .post(api('/admin/media'))
      .attach('image', await pngImage(), { filename: 'a.png', contentType: 'image/png' });
    expect(wrongField.status).toBe(400);

    const tooLarge = await agent
      .post(api('/admin/media'))
      .attach('file', Buffer.alloc(6 * 1024 * 1024), { filename: 'besar.png', contentType: 'image/png' });
    expect(tooLarge.status).toBe(413);
    expect(tooLarge.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('lists with pagination and deletes the record and the physical file', async () => {
    const { agent } = await loginAs('EDITOR');
    const uploaded = (
      await agent
        .post(api('/admin/media'))
        .attach('file', await pngImage(), { filename: 'hapus-saya.png', contentType: 'image/png' })
    ).body.data;

    const list = await agent.get(api('/admin/media?q=hapus&limit=5'));
    expect(list.status).toBe(200);
    expect(list.body.data.map((m) => m.id)).toEqual([uploaded.id]);
    expect(list.body.meta).toMatchObject({ total: 1, limit: 5 });

    const removed = await agent.delete(api(`/admin/media/${uploaded.id}`));
    expect(removed.status).toBe(200);
    expect(existsSync(path.join(UPLOAD_ROOT, uploaded.filename))).toBe(false);
    expect((await request().get(pathnameOf(uploaded.url))).status).toBe(404);
    expect((await agent.delete(api(`/admin/media/${uploaded.id}`))).status).toBe(404);
  });

  it('requires login', async () => {
    const res = await request()
      .post(api('/admin/media'))
      .attach('file', await pngImage(), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });

  it('does not serve dotfiles or paths outside the upload folder', async () => {
    expect((await request().get('/uploads/../package.json')).status).toBe(404);
    expect((await request().get('/uploads/%2e%2e/package.json')).status).toBe(404);
    expect((await request().get('/uploads/.env')).status).toBe(404);
  });
});
