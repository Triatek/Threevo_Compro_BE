import { beforeEach, describe, expect, it } from 'vitest';
import { api, loginAs, prisma, request } from './helpers.js';

describe('services', () => {
  beforeEach(async () => {
    await prisma.service.deleteMany();
  });

  describe('public', () => {
    it('lists only active, non-deleted services ordered by sortOrder without content', async () => {
      await prisma.service.createMany({
        data: [
          { name: 'Fulfillment', slug: 'fulfillment', sortOrder: 2, content: '<p>x</p>' },
          { name: 'WMS', slug: 'wms', sortOrder: 1 },
          { name: 'Draft', slug: 'draft', isActive: false },
          { name: 'Deleted', slug: 'deleted', deletedAt: new Date() },
        ],
      });

      const res = await request().get(api('/services'));

      expect(res.status).toBe(200);
      expect(res.body.data.map((s) => s.slug)).toEqual(['wms', 'fulfillment']);
      expect(res.body.data[0].content).toBeUndefined();
      expect(res.headers['cache-control']).toContain('max-age=60');
    });

    it('returns detail by slug and 404 for inactive/deleted/unknown', async () => {
      await prisma.service.createMany({
        data: [
          { name: 'WMS', slug: 'wms', content: '<p>Isi</p>', metaTitle: 'WMS Meta' },
          { name: 'Off', slug: 'off', isActive: false },
          { name: 'Gone', slug: 'gone', deletedAt: new Date() },
        ],
      });

      const ok = await request().get(api('/services/wms'));
      expect(ok.status).toBe(200);
      expect(ok.body.data).toMatchObject({ slug: 'wms', content: '<p>Isi</p>', metaTitle: 'WMS Meta' });
      expect(ok.body.data.deletedAt).toBeUndefined();

      for (const slug of ['off', 'gone', 'tidak-ada']) {
        const res = await request().get(api(`/services/${slug}`));
        expect(res.status).toBe(404);
      }
      expect((await request().get(api('/services/Bad%20Slug!'))).status).toBe(422);
    });
  });

  describe('admin', () => {
    it('creates with auto slug (-2 on duplicate) and sanitized content', async () => {
      const { agent } = await loginAs('EDITOR');

      const first = await agent.post(api('/admin/services')).send({
        name: 'Warehouse Management System',
        content: '<p>Aman</p><script>alert(1)</script>',
      });
      expect(first.status).toBe(201);
      expect(first.body.data.slug).toBe('warehouse-management-system');
      expect(first.body.data.content).toBe('<p>Aman</p>');

      const second = await agent
        .post(api('/admin/services'))
        .send({ name: 'Warehouse Management System' });
      expect(second.body.data.slug).toBe('warehouse-management-system-2');
    });

    it('returns 409 for an explicit slug that is already used', async () => {
      const { agent } = await loginAs('EDITOR');
      await agent.post(api('/admin/services')).send({ name: 'WMS', slug: 'wms' });

      const dup = await agent.post(api('/admin/services')).send({ name: 'Lain', slug: 'WMS' });
      expect(dup.status).toBe(409);
      expect(dup.body.error.details[0].field).toBe('slug');

      const other = (await agent.post(api('/admin/services')).send({ name: 'TMS' })).body.data;
      expect((await agent.patch(api(`/admin/services/${other.id}`)).send({ slug: 'wms' })).status).toBe(409);
      // Keeping its own slug is fine.
      expect((await agent.patch(api(`/admin/services/${other.id}`)).send({ slug: 'tms' })).status).toBe(200);
    });

    it('updates, soft deletes and hides deleted services everywhere', async () => {
      const { agent } = await loginAs('EDITOR');
      const created = (await agent.post(api('/admin/services')).send({ name: 'TMS', isFeatured: true }))
        .body.data;

      // Warm the public caches.
      expect((await request().get(api('/services'))).body.data).toHaveLength(1);
      expect((await request().get(api('/site'))).body.data.services).toHaveLength(1);

      const updated = await agent
        .patch(api(`/admin/services/${created.id}`))
        .send({ name: 'TMS Baru', content: '<p onclick="x()">Hi</p>' });
      expect(updated.status).toBe(200);
      expect(updated.body.data.slug).toBe('tms');
      expect(updated.body.data.content).toBe('<p>Hi</p>');
      expect((await request().get(api('/services/tms'))).body.data.name).toBe('TMS Baru');

      expect((await agent.delete(api(`/admin/services/${created.id}`))).status).toBe(200);

      const row = await prisma.service.findUnique({ where: { id: created.id } });
      expect(row.deletedAt).not.toBeNull();
      expect((await request().get(api('/services'))).body.data).toHaveLength(0);
      expect((await request().get(api('/site'))).body.data.services).toHaveLength(0);
      expect((await request().get(api('/services/tms'))).status).toBe(404);
      expect((await agent.get(api(`/admin/services/${created.id}`))).status).toBe(404);
      expect((await agent.get(api('/admin/services'))).body.meta.total).toBe(0);
    });

    it('lists with pagination & filters and reorders', async () => {
      const { agent } = await loginAs('EDITOR');
      const a = (await agent.post(api('/admin/services')).send({ name: 'Alpha', isFeatured: true })).body.data;
      const b = (await agent.post(api('/admin/services')).send({ name: 'Beta', isActive: false })).body.data;

      const featured = await agent.get(api('/admin/services?isFeatured=true'));
      expect(featured.body.data.map((s) => s.id)).toEqual([a.id]);
      expect(featured.body.data[0].content).toBeUndefined();

      const search = await agent.get(api('/admin/services?q=bet&limit=1'));
      expect(search.body.data.map((s) => s.id)).toEqual([b.id]);
      expect(search.body.meta).toMatchObject({ total: 1, limit: 1 });

      await agent.patch(api('/admin/services/reorder')).send([
        { id: a.id, sortOrder: 2 },
        { id: b.id, sortOrder: 1 },
      ]);
      const list = await agent.get(api('/admin/services'));
      expect(list.body.data.map((s) => s.id)).toEqual([b.id, a.id]);
    });

    it('validates input and requires login', async () => {
      const { agent } = await loginAs('EDITOR');
      const invalid = await agent
        .post(api('/admin/services'))
        .send({ name: 'X', metaDescription: 'x'.repeat(161), image: 'data:image/png;base64,xx' });
      expect(invalid.status).toBe(422);

      expect((await request().post(api('/admin/services')).send({ name: 'WMS' })).status).toBe(401);
    });
  });
});
