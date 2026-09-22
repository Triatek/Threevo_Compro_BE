import { beforeEach, describe, expect, it } from 'vitest';
import { api, createUser, loginAs, prisma, request } from './helpers.js';

const DAY = 24 * 60 * 60 * 1000;

async function resetContent() {
  await prisma.article.deleteMany();
  await prisma.category.deleteMany();
}

async function seedArticles() {
  const author = await createUser({ name: 'Penulis Satu' });
  const tips = await prisma.category.create({ data: { name: 'Tips Logistik', slug: 'tips-logistik' } });
  const event = await prisma.category.create({ data: { name: 'Event', slug: 'event' } });
  const now = Date.now();

  const make = (data) =>
    prisma.article.create({ data: { content: '<p>Isi</p>', authorId: author.id, ...data } });

  const articles = {
    tips1: await make({ title: 'Tips Packing Aman', slug: 'tips-packing', status: 'PUBLISHED', publishedAt: new Date(now - 3 * DAY), categoryId: tips.id, excerpt: 'Bubble wrap' }),
    tips2: await make({ title: 'Tips Gudang Rapi', slug: 'tips-gudang', status: 'PUBLISHED', publishedAt: new Date(now - 2 * DAY), categoryId: tips.id }),
    tips3: await make({ title: 'Tips Ongkir Hemat', slug: 'tips-ongkir', status: 'PUBLISHED', publishedAt: new Date(now - 1 * DAY), categoryId: tips.id }),
    event1: await make({ title: 'Pameran Logistik', slug: 'pameran', status: 'PUBLISHED', publishedAt: new Date(now - 4 * DAY), categoryId: event.id }),
    draft: await make({ title: 'Draft Rahasia', slug: 'draft-rahasia', status: 'DRAFT', categoryId: tips.id }),
    deleted: await make({ title: 'Terhapus', slug: 'terhapus', status: 'PUBLISHED', publishedAt: new Date(now - DAY), deletedAt: new Date(), categoryId: tips.id }),
    scheduled: await make({ title: 'Terjadwal', slug: 'terjadwal', status: 'PUBLISHED', publishedAt: new Date(now + DAY), categoryId: tips.id }),
  };
  return { author, tips, event, articles };
}

describe('public articles & categories', () => {
  beforeEach(resetContent);

  it('lists only published articles, newest first, without content', async () => {
    await seedArticles();

    const res = await request().get(api('/articles'));

    expect(res.status).toBe(200);
    expect(res.body.data.map((a) => a.slug)).toEqual([
      'tips-ongkir',
      'tips-gudang',
      'tips-packing',
      'pameran',
    ]);
    const first = res.body.data[0];
    expect(first.content).toBeUndefined();
    expect(first.category).toMatchObject({ slug: 'tips-logistik', name: 'Tips Logistik' });
    expect(first.author).toEqual({ name: 'Penulis Satu' });
    expect(res.body.meta).toMatchObject({ page: 1, limit: 10, total: 4, totalPages: 1 });
  });

  it('supports pagination, category filter and search on title/excerpt', async () => {
    await seedArticles();

    const page2 = await request().get(api('/articles?page=2&limit=3'));
    expect(page2.body.data.map((a) => a.slug)).toEqual(['pameran']);
    expect(page2.body.meta).toMatchObject({ total: 4, totalPages: 2, hasPrevPage: true, hasNextPage: false });

    const byCategory = await request().get(api('/articles?category=event'));
    expect(byCategory.body.data.map((a) => a.slug)).toEqual(['pameran']);

    const byTitle = await request().get(api('/articles?q=GUDANG'));
    expect(byTitle.body.data.map((a) => a.slug)).toEqual(['tips-gudang']);

    const byExcerpt = await request().get(api('/articles?q=bubble'));
    expect(byExcerpt.body.data.map((a) => a.slug)).toEqual(['tips-packing']);

    const hidden = await request().get(api('/articles?q=rahasia'));
    expect(hidden.body.data).toEqual([]);

    expect((await request().get(api('/articles?limit=51'))).status).toBe(422);
  });

  it('returns detail with related articles and increments viewCount without touching updatedAt', async () => {
    const { articles } = await seedArticles();

    const res = await request().get(api('/articles/tips-gudang'));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ slug: 'tips-gudang', content: '<p>Isi</p>', viewCount: 1 });
    expect(res.body.data.related.map((a) => a.slug)).toEqual(['tips-ongkir', 'tips-packing']);

    await request().get(api('/articles/tips-gudang'));
    const stored = await prisma.article.findUnique({ where: { id: articles.tips2.id } });
    expect(stored.viewCount).toBe(2);
    expect(stored.updatedAt.getTime()).toBe(articles.tips2.updatedAt.getTime());
  });

  it('returns 404 for draft, deleted, scheduled and unknown slugs', async () => {
    await seedArticles();
    for (const slug of ['draft-rahasia', 'terhapus', 'terjadwal', 'tidak-ada']) {
      expect((await request().get(api(`/articles/${slug}`))).status).toBe(404);
    }
  });

  it('lists categories with published article counts', async () => {
    await seedArticles();

    const res = await request().get(api('/categories'));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({ slug: 'event', articleCount: 1 }),
      expect.objectContaining({ slug: 'tips-logistik', articleCount: 3 }),
    ]);
  });
});

describe('admin articles', () => {
  beforeEach(resetContent);

  it('creates drafts with auto slug (-2 on duplicate) and sanitized content', async () => {
    const { agent, user } = await loginAs('EDITOR');

    const first = await agent.post(api('/admin/articles')).send({
      title: 'Cara Kirim Barang',
      content: '<p>Halo</p><img src="x" onerror="alert(1)">',
    });
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({
      slug: 'cara-kirim-barang',
      status: 'DRAFT',
      publishedAt: null,
      author: { id: user.id },
    });
    expect(first.body.data.content).not.toContain('onerror');

    const second = await agent
      .post(api('/admin/articles'))
      .send({ title: 'Cara Kirim Barang', content: '<p>Lagi</p>' });
    expect(second.body.data.slug).toBe('cara-kirim-barang-2');

    const third = await agent
      .post(api('/admin/articles'))
      .send({ title: 'Cara Kirim Barang', content: '<p>Lagi</p>' });
    expect(third.body.data.slug).toBe('cara-kirim-barang-3');
  });

  it('publish sets publishedAt once; unpublish hides it from public', async () => {
    const { agent } = await loginAs('EDITOR');
    const created = (await agent.post(api('/admin/articles')).send({ title: 'Berita Baru', content: '<p>x</p>' })).body.data;

    // Warm the public list cache.
    expect((await request().get(api('/articles'))).body.data).toHaveLength(0);

    const published = await agent.patch(api(`/admin/articles/${created.id}/publish`));
    expect(published.status).toBe(200);
    expect(published.body.data.status).toBe('PUBLISHED');
    const firstPublishedAt = published.body.data.publishedAt;
    expect(firstPublishedAt).not.toBeNull();

    expect((await request().get(api('/articles'))).body.data.map((a) => a.slug)).toEqual(['berita-baru']);
    expect((await request().get(api('/categories'))).status).toBe(200);

    const unpublished = await agent.patch(api(`/admin/articles/${created.id}/unpublish`));
    expect(unpublished.body.data.status).toBe('DRAFT');
    expect((await request().get(api('/articles'))).body.data).toHaveLength(0);
    expect((await request().get(api('/articles/berita-baru'))).status).toBe(404);

    const republished = await agent.patch(api(`/admin/articles/${created.id}/publish`));
    expect(republished.body.data.publishedAt).toBe(firstPublishedAt);

    const actions = (await prisma.auditLog.findMany({ where: { entity: 'Article', entityId: String(created.id) } })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['CREATE', 'PUBLISH', 'UNPUBLISH']));
  });

  it('fills publishedAt when created or updated as PUBLISHED', async () => {
    const { agent } = await loginAs('EDITOR');

    const created = await agent
      .post(api('/admin/articles'))
      .send({ title: 'Langsung Terbit', content: '<p>x</p>', status: 'PUBLISHED' });
    expect(created.body.data.publishedAt).not.toBeNull();

    const draft = (await agent.post(api('/admin/articles')).send({ title: 'Nanti', content: '<p>x</p>' })).body.data;
    const updated = await agent.patch(api(`/admin/articles/${draft.id}`)).send({ status: 'PUBLISHED' });
    expect(updated.body.data.publishedAt).not.toBeNull();

    const scheduledAt = new Date(Date.now() + 7 * DAY).toISOString();
    const scheduled = await agent
      .post(api('/admin/articles'))
      .send({ title: 'Terjadwal', content: '<p>x</p>', status: 'PUBLISHED', publishedAt: scheduledAt });
    expect(scheduled.body.data.publishedAt).toBe(scheduledAt);
    expect((await request().get(api('/articles/terjadwal'))).status).toBe(404);
  });

  it('soft deletes and filters admin list', async () => {
    const { agent } = await loginAs('EDITOR');
    const category = await prisma.category.create({ data: { name: 'Event', slug: 'event' } });
    const a = (await agent.post(api('/admin/articles')).send({ title: 'Artikel Event', content: '<p>x</p>', categoryId: category.id, status: 'PUBLISHED' })).body.data;
    const b = (await agent.post(api('/admin/articles')).send({ title: 'Artikel Draft', content: '<p>x</p>' })).body.data;

    expect((await agent.get(api('/admin/articles?status=draft'))).body.data.map((x) => x.id)).toEqual([b.id]);
    expect((await agent.get(api('/admin/articles?category=event'))).body.data.map((x) => x.id)).toEqual([a.id]);
    expect((await agent.get(api(`/admin/articles?categoryId=${category.id}&q=event`))).body.meta.total).toBe(1);
    expect((await agent.get(api('/admin/articles'))).body.data[0].content).toBeUndefined();

    expect((await agent.delete(api(`/admin/articles/${a.id}`))).status).toBe(200);
    expect((await prisma.article.findUnique({ where: { id: a.id } })).deletedAt).not.toBeNull();
    expect((await agent.get(api(`/admin/articles/${a.id}`))).status).toBe(404);
    expect((await agent.get(api('/admin/articles'))).body.meta.total).toBe(1);
    expect((await request().get(api('/articles/artikel-event'))).status).toBe(404);
  });

  it('validates input, unknown category, 404 and auth', async () => {
    const { agent } = await loginAs('EDITOR');

    expect((await agent.post(api('/admin/articles')).send({ title: 'ab' })).status).toBe(422);
    expect((await agent.post(api('/admin/articles')).send({ title: 'Judul', content: 'x', publishedAt: 'besok' })).status).toBe(422);

    const badCategory = await agent
      .post(api('/admin/articles'))
      .send({ title: 'Judul OK', content: '<p>x</p>', categoryId: 999999 });
    expect(badCategory.status).toBe(422);
    expect(badCategory.body.error.details[0].field).toBe('categoryId');

    expect((await agent.patch(api('/admin/articles/999999/publish'))).status).toBe(404);
    expect((await request().get(api('/admin/articles'))).status).toBe(401);
  });
});

describe('admin categories', () => {
  beforeEach(resetContent);

  it('CRUD with auto slug and 409 when still used by articles', async () => {
    const { agent } = await loginAs('EDITOR');

    const created = await agent.post(api('/admin/categories')).send({ name: 'Berita Perusahaan' });
    expect(created.status).toBe(201);
    expect(created.body.data.slug).toBe('berita-perusahaan');

    const dup = await agent.post(api('/admin/categories')).send({ name: 'Berita Perusahaan' });
    expect(dup.body.data.slug).toBe('berita-perusahaan-2');

    const explicitDup = await agent.post(api('/admin/categories')).send({ name: 'Lain', slug: 'berita-perusahaan' });
    expect(explicitDup.status).toBe(409);

    const article = (await agent.post(api('/admin/articles')).send({ title: 'Pakai Kategori', content: '<p>x</p>', categoryId: created.body.data.id })).body.data;

    const list = await agent.get(api('/admin/categories'));
    expect(list.body.data.find((c) => c.id === created.body.data.id).articleCount).toBe(1);

    const blocked = await agent.delete(api(`/admin/categories/${created.body.data.id}`));
    expect(blocked.status).toBe(409);

    await agent.delete(api(`/admin/articles/${article.id}`));
    expect((await agent.delete(api(`/admin/categories/${created.body.data.id}`))).status).toBe(200);
    expect((await agent.get(api(`/admin/categories/${created.body.data.id}`))).status).toBe(404);

    const renamed = await agent.patch(api(`/admin/categories/${dup.body.data.id}`)).send({ name: 'Kabar' });
    expect(renamed.body.data).toMatchObject({ name: 'Kabar', slug: 'berita-perusahaan-2' });
  });
});
