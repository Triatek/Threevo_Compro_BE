import { describe, expect, it } from 'vitest';
import { api, loginAs, prisma, request } from './helpers.js';

const IMG = '/uploads/2026/01/contoh.webp';

const resources = [
  {
    path: 'banners',
    valid: { title: 'Gratis Ongkir', image: IMG, ctaText: 'Hubungi', ctaLink: '/kontak' },
    invalid: { title: '', image: 'javascript:alert(1)', ctaLink: '//evil.com' },
    update: { subtitle: 'Sub judul' },
  },
  {
    path: 'clients',
    valid: { name: 'PT Contoh', logo: 'https://cdn.example.com/logo.png', website: 'https://contoh.id' },
    invalid: { name: 'PT', logo: 'bukan-url', website: 'ftp://contoh.id' },
    update: { website: null },
  },
  {
    path: 'testimonials',
    valid: { name: 'Sari', company: 'Toko Sari', message: 'Pengiriman cepat!' },
    invalid: { name: 'Sari' },
    update: { position: 'Owner' },
  },
];

describe.each(resources)('/admin/$path', ({ path, valid, invalid, update }) => {
  it('supports CRUD for EDITOR with audit logs', async () => {
    const { agent } = await loginAs('EDITOR');

    const created = await agent.post(api(`/admin/${path}`)).send(valid);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ ...valid, sortOrder: 0, isActive: true });
    const { id } = created.body.data;

    const list = await agent.get(api(`/admin/${path}`));
    expect(list.status).toBe(200);
    expect(list.body.data.map((item) => item.id)).toContain(id);

    const updated = await agent.patch(api(`/admin/${path}/${id}`)).send(update);
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject(update);

    expect((await agent.get(api(`/admin/${path}/${id}`))).status).toBe(200);
    expect((await agent.delete(api(`/admin/${path}/${id}`))).status).toBe(200);
    expect((await agent.get(api(`/admin/${path}/${id}`))).status).toBe(404);

    const actions = await prisma.auditLog.findMany({ where: { entityId: String(id) } });
    expect(actions.map((a) => a.action)).toEqual(
      expect.arrayContaining(['CREATE', 'UPDATE', 'DELETE']),
    );
  });

  it('validates input and returns 404 for unknown ids', async () => {
    const { agent } = await loginAs('EDITOR');

    expect((await agent.post(api(`/admin/${path}`)).send(invalid)).status).toBe(422);
    expect((await agent.patch(api(`/admin/${path}/999999`)).send(update)).status).toBe(404);
    expect((await agent.delete(api(`/admin/${path}/999999`))).status).toBe(404);
  });

  it('requires login', async () => {
    expect((await request().get(api(`/admin/${path}`))).status).toBe(401);
    expect((await request().post(api(`/admin/${path}`)).send(valid)).status).toBe(401);
  });

  it('reorders items and filters by isActive', async () => {
    const { agent } = await loginAs('EDITOR');
    const first = (await agent.post(api(`/admin/${path}`)).send(valid)).body.data;
    const second = (await agent.post(api(`/admin/${path}`)).send({ ...valid, isActive: false }))
      .body.data;

    const reorder = await agent.patch(api(`/admin/${path}/reorder`)).send([
      { id: first.id, sortOrder: 5 },
      { id: second.id, sortOrder: 1 },
    ]);
    expect(reorder.status).toBe(200);

    const list = await agent.get(api(`/admin/${path}`));
    const ids = list.body.data.map((item) => item.id);
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));

    const activeOnly = await agent.get(api(`/admin/${path}?isActive=true`));
    expect(activeOnly.body.data.every((item) => item.isActive)).toBe(true);

    const missing = await agent.patch(api(`/admin/${path}/reorder`)).send([{ id: 999999, sortOrder: 1 }]);
    expect(missing.status).toBe(404);

    const bad = await agent.patch(api(`/admin/${path}/reorder`)).send({ id: 1 });
    expect(bad.status).toBe(422);
  });
});
