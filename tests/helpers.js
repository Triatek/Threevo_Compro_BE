import bcrypt from 'bcryptjs';
import supertest from 'supertest';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';

export { app, prisma };

export const api = (path) => `${env.API_PREFIX}${path}`;

export const request = () => supertest(app);

/** Agent that keeps cookies between requests (for authenticated flows). */
export const agent = () => supertest.agent(app);

let userCounter = 0;

export async function createUser(overrides = {}) {
  userCounter += 1;
  const password = overrides.password ?? 'Password123!';
  const user = await prisma.user.create({
    data: {
      name: overrides.name ?? `User ${userCounter}`,
      // The API always stores lowercase emails.
      email: (overrides.email ?? `user${userCounter}-${Date.now()}@test.local`).toLowerCase(),
      role: overrides.role ?? 'EDITOR',
      isActive: overrides.isActive ?? true,
      // Low cost keeps tests fast; production uses cost 12.
      passwordHash: await bcrypt.hash(password, 4),
    },
  });
  return { ...user, password };
}

/**
 * Create a user (or use the given one) and return a logged-in supertest agent.
 * @returns {Promise<{ agent: import('supertest').Agent, user: object }>}
 */
export async function loginAs(roleOrUser = 'EDITOR') {
  const user = typeof roleOrUser === 'string' ? await createUser({ role: roleOrUser }) : roleOrUser;
  const loggedIn = agent();
  const res = await loggedIn.post(api('/auth/login')).send({
    email: user.email,
    password: user.password,
  });
  if (res.status !== 200) {
    throw new Error(`Login failed in test helper: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { agent: loggedIn, user };
}

/** Read a cookie value from a supertest response. */
export function getCookie(res, name) {
  const header = res.headers['set-cookie'] ?? [];
  const cookie = header.find((c) => c.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split(';')[0].slice(name.length + 1)) : undefined;
}
