import { describe, expect, it } from 'vitest';
import { api, createUser, loginAs, prisma, request } from './helpers.js';

describe('admin access control', () => {
  it('returns 401 for admin endpoints without login', async () => {
    const res = await request().get(api('/admin/users'));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 for EDITOR on /admin/users and /admin/audit-logs', async () => {
    const { agent } = await loginAs('EDITOR');

    expect((await agent.get(api('/admin/users'))).status).toBe(403);
    expect((await agent.get(api('/admin/audit-logs'))).status).toBe(403);
  });
});

describe('/admin/users (SUPER_ADMIN)', () => {
  it('creates, lists, gets and updates users without leaking password hashes', async () => {
    const { agent } = await loginAs('SUPER_ADMIN');

    const created = await agent.post(api('/admin/users')).send({
      name: 'Editor Baru',
      email: 'Editor.Baru@test.local',
      password: 'Rahasia123',
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ email: 'editor.baru@test.local', role: 'EDITOR' });
    expect(created.body.data.passwordHash).toBeUndefined();
    const id = created.body.data.id;

    const list = await agent.get(api('/admin/users?q=editor&limit=5'));
    expect(list.status).toBe(200);
    expect(list.body.data.some((u) => u.id === id)).toBe(true);
    expect(list.body.meta).toMatchObject({ page: 1, limit: 5 });
    expect(JSON.stringify(list.body)).not.toContain('passwordHash');

    expect((await agent.get(api(`/admin/users/${id}`))).status).toBe(200);

    const updated = await agent.patch(api(`/admin/users/${id}`)).send({ role: 'SUPER_ADMIN' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.role).toBe('SUPER_ADMIN');

    const audit = await prisma.auditLog.findMany({ where: { entity: 'User', entityId: String(id) } });
    expect(audit.map((a) => a.action)).toEqual(expect.arrayContaining(['CREATE', 'UPDATE']));
  });

  it('returns 409 for duplicate email, 422 for invalid body, 404 for missing user', async () => {
    const { agent } = await loginAs('SUPER_ADMIN');
    const existing = await createUser();

    const duplicate = await agent
      .post(api('/admin/users'))
      .send({ name: 'Dup', email: existing.email, password: 'Rahasia123' });
    expect(duplicate.status).toBe(409);

    const invalid = await agent
      .post(api('/admin/users'))
      .send({ name: 'X', email: 'salah', password: '123', role: 'ROOT' });
    expect(invalid.status).toBe(422);

    expect((await agent.get(api('/admin/users/999999'))).status).toBe(404);
    expect((await agent.patch(api('/admin/users/999999')).send({ name: 'Nama' })).status).toBe(404);
    expect((await agent.patch(api('/admin/users/abc')).send({ name: 'Nama' })).status).toBe(422);

    const empty = await agent.patch(api(`/admin/users/${existing.id}`)).send({});
    expect(empty.status).toBe(422);
  });

  it('deactivates instead of deleting and revokes the user sessions', async () => {
    const { agent } = await loginAs('SUPER_ADMIN');
    const { agent: editorAgent, user: editor } = await loginAs('EDITOR');

    const res = await agent.delete(api(`/admin/users/${editor.id}`));
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);

    expect(await prisma.user.findUnique({ where: { id: editor.id } })).not.toBeNull();
    expect((await editorAgent.get(api('/auth/me'))).status).toBe(401);
    expect((await editorAgent.post(api('/auth/refresh'))).status).toBe(401);
  });

  it('prevents deactivating or demoting yourself', async () => {
    const { agent, user } = await loginAs('SUPER_ADMIN');

    expect((await agent.delete(api(`/admin/users/${user.id}`))).status).toBe(400);
    expect((await agent.patch(api(`/admin/users/${user.id}`)).send({ isActive: false })).status).toBe(400);
    expect((await agent.patch(api(`/admin/users/${user.id}`)).send({ role: 'EDITOR' })).status).toBe(400);
    expect((await agent.patch(api(`/admin/users/${user.id}`)).send({ name: 'Nama Baru' })).status).toBe(200);
  });

  it('allows deactivating another super admin but never the only one left', async () => {
    await prisma.user.updateMany({ data: { isActive: false } });
    const { agent, user } = await loginAs('SUPER_ADMIN');
    const other = await createUser({ role: 'SUPER_ADMIN' });

    expect((await agent.delete(api(`/admin/users/${other.id}`))).status).toBe(200);
    // Now the requester is the last active super admin.
    expect((await agent.delete(api(`/admin/users/${user.id}`))).status).toBe(400);
    expect(await prisma.user.count({ where: { role: 'SUPER_ADMIN', isActive: true } })).toBe(1);
  });
});

describe('GET /admin/audit-logs', () => {
  it('lists audit logs with filters', async () => {
    const { agent, user } = await loginAs('SUPER_ADMIN');

    const res = await agent.get(api(`/admin/audit-logs?entity=User&action=login&userId=${user.id}`));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toMatchObject({ action: 'LOGIN', entity: 'User', userId: user.id });
    expect(res.body.data[0].user).toMatchObject({ id: user.id });
    expect(res.body.meta.total).toBeGreaterThan(0);
  });
});
