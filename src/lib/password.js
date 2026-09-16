import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

// Cost 12 in real environments; lower in tests to keep them fast.
const BCRYPT_COST = env.isTest ? 4 : 12;

// Pre-computed hash of a random string. Comparing against it when the email does
// not exist makes failed logins take the same time (prevents user enumeration).
const DUMMY_HASH = '$2b$12$Z7m3Of3hw8lHenrFt4BAD.FX3Gu2hcoF8up3166CjgloaTo6bBwNy';

export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash ?? DUMMY_HASH);
}
