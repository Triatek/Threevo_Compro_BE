import { beforeEach, describe, expect, it } from 'vitest';
import { api, loginAs, prisma, request } from './helpers.js';

const base = { address: 'Jl. Raya No. 1', city: 'Jakarta Timur' };

describe('locations', () => {
  beforeEach(async () => {
    await prisma.location.deleteMany();
  });

  it('public list returns active locations with numeric coordinates and filters', async () => {
    await prisma.location.createMany({
      data: [
        { ...base, name: 'Gudang Cakung', type: 'WAREHOUSE', latitude: '-6.1833000', longitude: '106.9333000' },
        { ...base, name: 'Kantor Pusat', type: 'OFFICE', city: 'Jakarta Selatan' },
        { ...base, name: 'Hub Tutup', type: 'HUB', isActive: false },
      ],
    });

    const all = await request().get(api('/locations'));
    expect(all.status).toBe(200);
    expect(all.body.data.map((l) => l.name)).toEqual(['Gudang Cakung', 'Kantor Pusat']);
    expect(all.body.data[0].latitude).toBe(-6.1833);
    expect(all.body.data[0].longitude).toBe(106.9333);
    expect(all.body.data[0].isActive).toBeUndefined();

    const byCity = await request().get(api('/locations?city=jakarta%20timur'));
    expect(byCity.body.data.map((l) => l.name)).toEqual(['Gudang Cakung']);

    const byType = await request().get(api('/locations?type=office'));
    expect(byType.body.data.map((l) => l.name)).toEqual(['Kantor Pusat']);

    expect((await request().get(api('/locations?type=RUMAH'))).status).toBe(422);
  });

  it('admin CRUD with coordinate validation and cache invalidation', async () => {
    const { agent } = await loginAs('EDITOR');

    const outOfRange = await agent
      .post(api('/admin/locations'))
      .send({ ...base, name: 'Salah', latitude: 91, longitude: 181 });
    expect(outOfRange.status).toBe(422);
    expect(outOfRange.body.error.details.map((d) => d.field)).toEqual(
      expect.arrayContaining(['latitude', 'longitude']),
    );

    const onlyLat = await agent
      .post(api('/admin/locations'))
      .send({ ...base, name: 'Setengah', latitude: -6.2 });
    expect(onlyLat.status).toBe(422);

    // Warm cache.
    expect((await request().get(api('/locations'))).body.data).toHaveLength(0);

    const created = await agent
      .post(api('/admin/locations'))
      .send({ ...base, name: 'Hub Bekasi', type: 'HUB', latitude: -6.2383, longitude: 106.9756 });
    expect(created.status).toBe(201);
    expect(created.body.data.latitude).toBe(-6.2383);
    const { id } = created.body.data;

    expect((await request().get(api('/locations'))).body.data).toHaveLength(1);

    const clearOne = await agent.patch(api(`/admin/locations/${id}`)).send({ latitude: null });
    expect(clearOne.status).toBe(422);
    const clearBoth = await agent
      .patch(api(`/admin/locations/${id}`))
      .send({ latitude: null, longitude: null });
    expect(clearBoth.status).toBe(200);
    expect(clearBoth.body.data.latitude).toBeNull();

    const list = await agent.get(api('/admin/locations?q=bekasi&type=hub'));
    expect(list.body.meta.total).toBe(1);

    expect((await agent.delete(api(`/admin/locations/${id}`))).status).toBe(200);
    expect((await agent.get(api(`/admin/locations/${id}`))).status).toBe(404);
    expect((await request().get(api('/locations'))).body.data).toHaveLength(0);
  });

  it('requires login for admin endpoints', async () => {
    expect((await request().get(api('/admin/locations'))).status).toBe(401);
  });
});
