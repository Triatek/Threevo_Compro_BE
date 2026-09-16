import { afterAll, beforeAll } from 'vitest';
import { loadTestEnv } from './loadTestEnv.js';

// Must run before any app module reads the environment.
loadTestEnv();

// Imported dynamically so env.js sees the variables loaded above.
const { prisma } = await import('../src/lib/prisma.js');

beforeAll(async () => {
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length) {
    const names = tables.map(({ tablename }) => `"public"."${tablename}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
