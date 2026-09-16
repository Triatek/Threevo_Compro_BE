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
      email: overrides.email ?? `user${userCounter}-${Date.now()}@test.local`,
      role: overrides.role ?? 'EDITOR',
      isActive: overrides.isActive ?? true,
      // Low cost keeps tests fast; production uses cost 12.
      passwordHash: await bcrypt.hash(password, 4),
    },
  });
  return { ...user, password };
}
