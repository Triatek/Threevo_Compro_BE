import { beforeEach, describe, expect, it } from 'vitest';
import { api, loginAs, prisma, request } from './helpers.js';

const IMG = 'https://cdn.example.com/banner.webp';

async function seedSettings() {
  await prisma.setting.createMany({
    data: [
      { key: 'company_name', value: 'Threevo', isPublic: true },
      { key: 'whatsapp_number', value: '6281200000000', isPublic: true },
      { key: 'lead_notification_email', value: 'rahasia@threevo.id', isPublic: false },
      { key: 'unknown_key', value: 'x', isPublic: true },
    ],
  });
}

describe('GET /site', () => {
  beforeEach(async () => {
    await prisma.setting.deleteMany();
    await prisma.banner.deleteMany();
    await prisma.client.deleteMany();
    await prisma.testimonial.deleteMany();
    await prisma.service.deleteMany();
  });

  it('returns only public settings and active items', async () => {
    await seedSettings();
    await prisma.banner.createMany({
      data: [
        { title: 'Aktif', image: IMG, sortOrder: 2 },
        { title: 'Pertama', image: IMG, sortOrder: 1 },
        { title: 'Nonaktif', image: IMG, isActive: false },
      ],
    });
    await prisma.client.createMany({
      data: [
        { name: 'Klien A', logo: IMG },
        { name: 'Klien B', logo: IMG, isActive: false },
      ],
    });
    await prisma.testimonial.createMany({
      data: [
        { name: 'Andi', message: 'Mantap' },
        { name: 'Budi', message: 'Hidden', isActive: false },
      ],
    });
    await prisma.service.createMany({
      data: [
        { name: 'WMS', slug: 'wms', isFeatured: true, content: '<p>rahasia</p>' },
        { name: 'Biasa', slug: 'biasa', isFeatured: false },
        { name: 'Off', slug: 'off', isFeatured: true, isActive: false },
        { name: 'Hapus', slug: 'hapus', isFeatured: true, deletedAt: new Date() },
      ],
    });

    const res = await request().get(api('/site'));

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('public');
    const { settings, banners, clients, testimonials, services } = res.body.data;

    expect(settings).toEqual({ company_name: 'Threevo', whatsapp_number: '6281200000000' });
    expect(banners.map((b) => b.title)).toEqual(['Pertama', 'Aktif']);
    expect(banners[0].isActive).toBeUndefined();
    expect(clients.map((c) => c.name)).toEqual(['Klien A']);
    expect(testimonials.map((t) => t.name)).toEqual(['Andi']);
    expect(services.map((s) => s.slug)).toEqual(['wms']);
    expect(services[0].content).toBeUndefined();
  });

  it('reflects admin changes immediately (cache invalidation)', async () => {
    const { agent } = await loginAs('SUPER_ADMIN');

    const before = await request().get(api('/site'));
    expect(before.body.data.banners).toEqual([]);

    const created = await agent.post(api('/admin/banners')).send({ title: 'Promo', image: IMG });
    expect(created.status).toBe(201);
    const afterCreate = await request().get(api('/site'));
    expect(afterCreate.body.data.banners.map((b) => b.title)).toEqual(['Promo']);

    await agent.put(api('/admin/settings')).send({ company_name: 'Threevo Baru' });
    const afterSettings = await request().get(api('/site'));
    expect(afterSettings.body.data.settings.company_name).toBe('Threevo Baru');

    await agent.patch(api(`/admin/banners/${created.body.data.id}`)).send({ isActive: false });
    const afterDeactivate = await request().get(api('/site'));
    expect(afterDeactivate.body.data.banners).toEqual([]);
  });

  it('serves from cache when data changes outside the admin API', async () => {
    await request().get(api('/site'));
    await prisma.banner.create({ data: { title: 'Langsung DB', image: IMG } });

    const cached = await request().get(api('/site'));
    expect(cached.body.data.banners).toEqual([]);
  });
});

describe('/admin/settings', () => {
  beforeEach(async () => {
    await prisma.setting.deleteMany();
  });

  it('is SUPER_ADMIN only', async () => {
    const { agent } = await loginAs('EDITOR');
    expect((await agent.get(api('/admin/settings'))).status).toBe(403);
    expect((await agent.put(api('/admin/settings')).send({ company_name: 'X' })).status).toBe(403);
    expect((await request().get(api('/admin/settings'))).status).toBe(401);
  });

  it('returns all known keys, including private ones', async () => {
    await seedSettings();
    const { agent } = await loginAs('SUPER_ADMIN');

    const res = await agent.get(api('/admin/settings'));
    expect(res.status).toBe(200);
    expect(res.body.data.lead_notification_email).toBe('rahasia@threevo.id');
    expect(res.body.data.contact_phone).toBe('');
    expect(res.body.data.unknown_key).toBeUndefined();
  });

  it('updates known keys, keeps private keys private and writes an audit log', async () => {
    const { agent, user } = await loginAs('SUPER_ADMIN');

    const res = await agent.put(api('/admin/settings')).send({
      whatsapp_number: '6281234567890',
      lead_notification_email: 'sales@threevo.id, marketing@threevo.id',
      social_instagram: '',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.whatsapp_number).toBe('6281234567890');

    const stored = await prisma.setting.findUnique({ where: { key: 'lead_notification_email' } });
    expect(stored.isPublic).toBe(false);

    const site = await request().get(api('/site'));
    expect(site.body.data.settings.lead_notification_email).toBeUndefined();

    expect(
      await prisma.auditLog.count({ where: { entity: 'Setting', action: 'UPDATE', userId: user.id } }),
    ).toBe(1);
  });

  it('rejects unknown keys and invalid values', async () => {
    const { agent } = await loginAs('SUPER_ADMIN');

    const unknown = await agent.put(api('/admin/settings')).send({ hacked: 'yes' });
    expect(unknown.status).toBe(422);

    const invalid = await agent.put(api('/admin/settings')).send({
      whatsapp_number: '+62 812',
      contact_email: 'bukan-email',
      social_linkedin: 'javascript:alert(1)',
    });
    expect(invalid.status).toBe(422);
    expect(invalid.body.error.details.map((d) => d.field)).toEqual(
      expect.arrayContaining(['whatsapp_number', 'contact_email', 'social_linkedin']),
    );
  });
});
