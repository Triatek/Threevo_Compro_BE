import { describe, expect, it } from 'vitest';
import { hashToken } from '../src/modules/auth/auth.service.js';
import { agent, api, createUser, getCookie, loginAs, prisma, request } from './helpers.js';

describe('POST /auth/login', () => {
  it('logs in, sets httpOnly cookies and records last login + audit', async () => {
    const user = await createUser({ email: 'Budi@Test.local' });

    const res = await request()
      .post(api('/auth/login'))
      .send({ email: '  BUDI@test.local ', password: user.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ id: user.id, email: 'budi@test.local' });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.headers['cache-control']).toBe('no-store');

    const cookies = res.headers['set-cookie'].join('\n');
    expect(cookies).toMatch(/access_token=[^;]+;.*HttpOnly/);
    expect(cookies).toMatch(/refresh_token=[^;]+;.*Path=\/api\/v1\/auth;.*HttpOnly/);
    expect(cookies).toMatch(/SameSite=Lax/);

    const stored = await prisma.user.findUnique({ where: { id: user.id } });
    expect(stored.lastLoginAt).not.toBeNull();
    const audit = await prisma.auditLog.findFirst({ where: { action: 'LOGIN', userId: user.id } });
    expect(audit).not.toBeNull();

    // Refresh token is stored hashed, never in plain text.
    const raw = getCookie(res, 'refresh_token');
    expect(await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(raw) } })).not.toBeNull();
    expect(await prisma.refreshToken.findFirst({ where: { tokenHash: raw } })).toBeNull();
  });

  it('returns the same message for wrong password and unknown email', async () => {
    const user = await createUser();

    const wrongPassword = await request()
      .post(api('/auth/login'))
      .send({ email: user.email, password: 'SalahBanget1' });
    const unknownEmail = await request()
      .post(api('/auth/login'))
      .send({ email: 'tidak-ada@test.local', password: 'SalahBanget1' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe('Email atau password salah');
    expect(unknownEmail.body.error.message).toBe(wrongPassword.body.error.message);
  });

  it('rejects inactive users', async () => {
    const user = await createUser({ isActive: false });
    const res = await request()
      .post(api('/auth/login'))
      .send({ email: user.email, password: user.password });

    expect(res.status).toBe(401);
  });

  it('validates the body', async () => {
    const res = await request().post(api('/auth/login')).send({ email: 'bukan-email' });

    expect(res.status).toBe(422);
    expect(res.body.error.details.map((d) => d.field)).toEqual(
      expect.arrayContaining(['email', 'password']),
    );
  });
});

describe('session flow', () => {
  it('login -> me -> refresh -> logout', async () => {
    const { agent: session, user } = await loginAs('EDITOR');

    const me = await session.get(api('/auth/me'));
    expect(me.status).toBe(200);
    expect(me.body.data).toMatchObject({ id: user.id, role: 'EDITOR' });

    const refreshed = await session.post(api('/auth/refresh'));
    expect(refreshed.status).toBe(200);
    expect(getCookie(refreshed, 'access_token')).toBeTruthy();

    const meAfterRefresh = await session.get(api('/auth/me'));
    expect(meAfterRefresh.status).toBe(200);

    const logout = await session.post(api('/auth/logout'));
    expect(logout.status).toBe(200);
    expect(logout.headers['set-cookie'].join('\n')).toMatch(/access_token=;/);

    const meAfterLogout = await session.get(api('/auth/me'));
    expect(meAfterLogout.status).toBe(401);

    const refreshAfterLogout = await session.post(api('/auth/refresh'));
    expect(refreshAfterLogout.status).toBe(401);
  });

  it('accepts Authorization: Bearer as a fallback', async () => {
    const user = await createUser();
    const login = await request()
      .post(api('/auth/login'))
      .send({ email: user.email, password: user.password });
    const token = getCookie(login, 'access_token');

    const res = await request().get(api('/auth/me')).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('rejects invalid tokens and tokens of deactivated users', async () => {
    const invalid = await request().get(api('/auth/me')).set('Authorization', 'Bearer abc.def.ghi');
    expect(invalid.status).toBe(401);

    const { agent: session, user } = await loginAs('EDITOR');
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    expect((await session.get(api('/auth/me'))).status).toBe(401);
  });

  it('revokes all sessions when a rotated refresh token is reused', async () => {
    const user = await createUser();
    const login = await request()
      .post(api('/auth/login'))
      .send({ email: user.email, password: user.password });
    const oldRefresh = getCookie(login, 'refresh_token');

    const first = await request()
      .post(api('/auth/refresh'))
      .set('Cookie', `refresh_token=${oldRefresh}`);
    expect(first.status).toBe(200);
    const newRefresh = getCookie(first, 'refresh_token');
    expect(newRefresh).not.toBe(oldRefresh);

    // Attacker replays the old token.
    const reuse = await request()
      .post(api('/auth/refresh'))
      .set('Cookie', `refresh_token=${oldRefresh}`);
    expect(reuse.status).toBe(401);

    // The legitimate new token is revoked as well.
    const legit = await request()
      .post(api('/auth/refresh'))
      .set('Cookie', `refresh_token=${newRefresh}`);
    expect(legit.status).toBe(401);

    const active = await prisma.refreshToken.count({ where: { userId: user.id, revokedAt: null } });
    expect(active).toBe(0);
  });

  it('rejects refresh without cookie', async () => {
    const res = await request().post(api('/auth/refresh'));
    expect(res.status).toBe(401);
  });
});

describe('PATCH /auth/me/password', () => {
  it('changes password and revokes other sessions', async () => {
    const user = await createUser();
    const { agent: sessionA } = await loginAs(user);
    const { agent: sessionB } = await loginAs(user);

    const res = await sessionA
      .patch(api('/auth/me/password'))
      .send({ currentPassword: user.password, newPassword: 'PasswordBaru123' });
    expect(res.status).toBe(200);

    expect((await sessionA.post(api('/auth/refresh'))).status).toBe(200);
    expect((await sessionB.post(api('/auth/refresh'))).status).toBe(401);

    const oldLogin = await agent()
      .post(api('/auth/login'))
      .send({ email: user.email, password: user.password });
    expect(oldLogin.status).toBe(401);
    const newLogin = await agent()
      .post(api('/auth/login'))
      .send({ email: user.email, password: 'PasswordBaru123' });
    expect(newLogin.status).toBe(200);
  });

  it('returns 422 for wrong current password or weak new password', async () => {
    const { agent: session } = await loginAs('EDITOR');

    const wrong = await session
      .patch(api('/auth/me/password'))
      .send({ currentPassword: 'salah123', newPassword: 'PasswordBaru123' });
    expect(wrong.status).toBe(422);
    expect(wrong.body.error.details[0].field).toBe('currentPassword');

    const weak = await session
      .patch(api('/auth/me/password'))
      .send({ currentPassword: 'x', newPassword: 'pendek' });
    expect(weak.status).toBe(422);
  });

  it('requires login', async () => {
    const res = await request()
      .patch(api('/auth/me/password'))
      .send({ currentPassword: 'a', newPassword: 'PasswordBaru123' });
    expect(res.status).toBe(401);
  });
});
