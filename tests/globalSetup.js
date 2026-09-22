import { execSync } from 'node:child_process';
import { loadTestEnv } from './loadTestEnv.js';

// Runs once before all test files: apply migrations to the test database.
export default function setup() {
  loadTestEnv();
  execSync('npx prisma migrate deploy', { stdio: 'pipe', env: process.env });
}
