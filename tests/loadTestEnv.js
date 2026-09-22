import { existsSync } from 'node:fs';
import dotenv from 'dotenv';

/**
 * Load .env.test and make sure we never run destructive test setup against a
 * non-test database.
 */
export function loadTestEnv() {
  if (!existsSync('.env.test')) {
    throw new Error('.env.test not found. Copy .env.test.example to .env.test first.');
  }

  process.env.NODE_ENV = 'test';
  dotenv.config({ path: '.env.test', override: true, quiet: true });

  const databaseName = new URL(process.env.DATABASE_URL).pathname.slice(1);
  if (!databaseName.includes('test')) {
    throw new Error(`Refusing to run tests: database "${databaseName}" is not a test database.`);
  }
}
