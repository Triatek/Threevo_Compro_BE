import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captcha } from '../src/lib/captcha.js';
import { mailer } from '../src/lib/mailer.js';
import { escapeCsvCell, toCsv } from '../src/utils/csv.js';
import { api, loginAs, prisma, request } from './helpers.js';

const validLead = {
  name: 'Budi Santoso',
  email: 'Budi@Toko.id',
  phone: '0812-3456-7890',
  company: 'Toko Budi',
  serviceInterest: 'Fulfillment',
  message: 'Halo, saya ingin tahu harga fulfillment untuk 500 order per hari.',
};

describe('POST /leads', () => {
  beforeEach(async () => {
    await prisma.lead.deleteMany();
    await prisma.setting.deleteMany();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores the lead with meta data and emails the team after responding', async () => {
    await prisma.setting.create({
      data: { key: 'lead_notification_email', value: 'sales@threevo.id', isPublic: false },
    });
    const send = vi.spyOn(mailer, 'send').mockResolvedValue({});

    const res = await request()
      .post(api('/leads?utm_source=instagram'))
      .set('User-Agent', 'Mozilla/5.0 Test')
      .send({ ...validLead, message: `${validLead.message} <script>alert(1)</script>`, website: '' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, data: null });
    expect(res.body.message).toMatch(/Terima kasih/);

    const lead = await prisma.lead.findFirst();
    expect(lead).toMatchObject({
      email: 'budi@toko.id',
      status: 'NEW',
      source: 'instagram',
      userAgent: 'Mozilla/5.0 Test',
    });
    expect(lead.ipAddress).toBeTruthy();

    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    const mail = send.mock.calls[0][0];
    expect(mail.to).toBe('sales@threevo.id');
    expect(mail.replyTo).toBe('budi@toko.id');
    expect(mail.subject).toContain('Budi Santoso');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).not.toContain('<script>');
  });

  it('uses the referer as source when there is no utm_source', async () => {
    vi.spyOn(mailer, 'send').mockResolvedValue({});
    await request()
      .post(api('/leads'))
      .set('Referer', 'https://threevo.id/layanan/fulfillment?ref=1')
      .send(validLead)
      .expect(201);

    expect((await prisma.lead.findFirst()).source).toBe('threevo.id/layanan/fulfillment');
  });

  it('keeps the lead when the email fails', async () => {
    await prisma.setting.create({
      data: { key: 'lead_notification_email', value: 'sales@threevo.id', isPublic: false },
    });
    const send = vi.spyOn(mailer, 'send').mockRejectedValue(new Error('SMTP down'));

    const res = await request().post(api('/leads')).send(validLead);

    expect(res.status).toBe(201);
    await vi.waitFor(() => expect(send).toHaveBeenCalled());
    expect(await prisma.lead.count()).toBe(1);
  });

  it('silently ignores submissions with the honeypot filled', async () => {
    const send = vi.spyOn(mailer, 'send');

    const res = await request()
      .post(api('/leads'))
      .send({ ...validLead, website: 'http://spam.example' });

    expect(res.status).toBe(201);
    expect(await prisma.lead.count()).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects when CAPTCHA verification fails', async () => {
    const verify = vi.spyOn(captcha, 'verify').mockResolvedValue(false);

    const res = await request()
      .post(api('/leads'))
      .send({ ...validLead, captchaToken: 'bad-token' });

    expect(res.status).toBe(400);
    expect(verify).toHaveBeenCalledWith('bad-token', expect.any(String));
    expect(await prisma.lead.count()).toBe(0);
  });

  it('validates the form', async () => {
    const res = await request()
      .post(api('/leads'))
      .send({ name: 'B', email: 'bukan-email', phone: 'abc', message: 'pendek' });

    expect(res.status).toBe(422);
    expect(res.body.error.details.map((d) => d.field)).toEqual(
      expect.arrayContaining(['name', 'email', 'phone', 'message']),
    );
  });
});

async function seedLeads() {
  const make = (data) => prisma.lead.create({ data: { message: 'Pesan contoh yang cukup panjang', ...data } });
  return {
    a: await make({ name: 'Andi', email: 'andi@a.id', company: 'PT Andalan', status: 'NEW', createdAt: new Date('2026-01-10T03:00:00Z') }),
    b: await make({ name: 'Bella', email: 'bella@b.id', status: 'CONTACTED', createdAt: new Date('2026-01-15T18:30:00Z') }), // 16 Jan 01:30 WIB
    c: await make({ name: '=HYPERLINK("http://evil")', email: 'c@c.id', status: 'CLOSED', notes: 'Catatan, dengan "kutip"', createdAt: new Date('2026-01-20T03:00:00Z') }),
    deleted: await make({ name: 'Dihapus', email: 'd@d.id', deletedAt: new Date() }),
  };
}

describe('/admin/leads', () => {
  beforeEach(async () => {
    await prisma.lead.deleteMany();
  });

  it('lists with filters (status, q, WIB date range) and hides deleted leads', async () => {
    const { a, b, c } = await seedLeads();
    const { agent } = await loginAs('EDITOR');

    const all = await agent.get(api('/admin/leads'));
    expect(all.status).toBe(200);
    expect(all.body.data.map((l) => l.id)).toEqual([c.id, b.id, a.id]);
    expect(all.body.data[0].message).toBeUndefined();

    expect((await agent.get(api('/admin/leads?status=contacted'))).body.data.map((l) => l.id)).toEqual([b.id]);
    expect((await agent.get(api('/admin/leads?q=andalan'))).body.data.map((l) => l.id)).toEqual([a.id]);

    // Bella was created on 16 Jan in WIB even though it is 15 Jan in UTC.
    const range = await agent.get(api('/admin/leads?from=2026-01-16&to=2026-01-16'));
    expect(range.body.data.map((l) => l.id)).toEqual([b.id]);

    expect((await agent.get(api('/admin/leads?from=2026-02-01&to=2026-01-01'))).status).toBe(422);
  });

  it('gets, updates status/notes with audit log, and 404 for deleted', async () => {
    const { a, deleted } = await seedLeads();
    const { agent } = await loginAs('EDITOR');

    const detail = await agent.get(api(`/admin/leads/${a.id}`));
    expect(detail.body.data.message).toBeDefined();

    const updated = await agent
      .patch(api(`/admin/leads/${a.id}`))
      .send({ status: 'CONTACTED', notes: 'Sudah ditelepon' });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ status: 'CONTACTED', notes: 'Sudah ditelepon' });

    const audit = await prisma.auditLog.findFirst({ where: { entity: 'Lead', entityId: String(a.id) } });
    expect(audit.metadata).toMatchObject({ from: 'NEW', to: 'CONTACTED' });

    expect((await agent.patch(api(`/admin/leads/${a.id}`)).send({ status: 'SPAM' })).status).toBe(422);
    expect((await agent.get(api(`/admin/leads/${deleted.id}`))).status).toBe(404);
  });

  it('only SUPER_ADMIN can delete (soft)', async () => {
    const { a } = await seedLeads();
    const { agent: editor } = await loginAs('EDITOR');
    const { agent: admin } = await loginAs('SUPER_ADMIN');

    expect((await editor.delete(api(`/admin/leads/${a.id}`))).status).toBe(403);
    expect((await admin.delete(api(`/admin/leads/${a.id}`))).status).toBe(200);
    expect((await prisma.lead.findUnique({ where: { id: a.id } })).deletedAt).not.toBeNull();
  });

  it('exports CSV with BOM, filters and formula injection protection', async () => {
    await seedLeads();
    const { agent } = await loginAs('EDITOR');

    const res = await agent.get(api('/admin/leads/export?status=closed')).buffer(true).parse((response, done) => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => done(null, data));
    });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="leads-\d{4}-\d{2}-\d{2}\.csv"/);
    expect(res.body.startsWith('﻿')).toBe(true);

    const lines = res.body.slice(1).trim().split('\r\n');
    expect(lines[0]).toBe('ID,Tanggal (WIB),Nama,Email,Telepon,Perusahaan,Layanan,Pesan,Status,Catatan,Sumber');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(lines[1]).toContain('"Catatan, dengan ""kutip"""');
    expect(lines[1]).toContain('2026-01-20 10:00');
    expect(lines[1]).toContain('Selesai');

    expect(await prisma.auditLog.count({ where: { entity: 'Lead', action: 'EXPORT' } })).toBe(1);
  });

  it('requires login', async () => {
    expect((await request().get(api('/admin/leads'))).status).toBe(401);
    expect((await request().get(api('/admin/leads/export'))).status).toBe(401);
  });
});

describe('csv utils', () => {
  it.each([
    ['=1+1', "'=1+1"],
    ['+62812', "'+62812"],
    ['-5', "'-5"],
    ['@SUM(A1)', "'@SUM(A1)"],
    ['biasa', 'biasa'],
    [null, ''],
    ['a,b', '"a,b"'],
    ['baris\nbaru', '"baris\nbaru"'],
  ])('escapeCsvCell(%j) -> %j', (input, expected) => {
    expect(escapeCsvCell(input)).toBe(expected);
  });

  it('toCsv adds BOM and CRLF', () => {
    expect(toCsv(['a', 'b'], [[1, 2]])).toBe('﻿a,b\r\n1,2\r\n');
  });
});

describe('GET /admin/dashboard', () => {
  beforeEach(async () => {
    await prisma.lead.deleteMany();
    await prisma.article.deleteMany();
  });

  it('returns counts, 30 day lead chart and recent leads', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    await prisma.lead.createMany({
      data: [
        { name: 'Satu', email: 'a@a.id', message: 'x', createdAt: now },
        { name: 'Dua', email: 'b@b.id', message: 'x', createdAt: now, status: 'CONTACTED' },
        { name: 'Kemarin', email: 'c@c.id', message: 'x', createdAt: yesterday },
        { name: 'Lama', email: 'd@d.id', message: 'x', createdAt: new Date('2020-01-01') },
        { name: 'Hapus', email: 'e@e.id', message: 'x', createdAt: now, deletedAt: now },
      ],
    });
    await prisma.article.createMany({
      data: [
        { title: 'A', slug: 'a', content: 'x', status: 'PUBLISHED', publishedAt: now },
        { title: 'B', slug: 'b', content: 'x' },
        { title: 'C', slug: 'c', content: 'x', deletedAt: now },
      ],
    });
    const { agent } = await loginAs('EDITOR');

    const res = await agent.get(api('/admin/dashboard'));

    expect(res.status).toBe(200);
    const { articles, leads, leadsLast30Days, recentLeads } = res.body.data;
    expect(articles).toEqual({ DRAFT: 1, PUBLISHED: 1, total: 2 });
    expect(leads).toEqual({ NEW: 3, CONTACTED: 1, CLOSED: 0, total: 4 });

    expect(leadsLast30Days).toHaveLength(30);
    const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
    const yesterdayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(yesterday);
    expect(leadsLast30Days.at(-1)).toEqual({ date: todayKey, count: 2 });
    expect(leadsLast30Days.at(-2)).toEqual({ date: yesterdayKey, count: 1 });
    expect(leadsLast30Days.reduce((sum, d) => sum + d.count, 0)).toBe(3);

    expect(recentLeads).toHaveLength(4);
    expect(recentLeads[0].message).toBeUndefined();
  });

  it('requires login', async () => {
    expect((await request().get(api('/admin/dashboard'))).status).toBe(401);
  });
});
