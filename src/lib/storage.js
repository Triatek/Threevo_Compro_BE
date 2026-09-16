import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

/**
 * File storage abstraction. Only the `local` driver exists for now; an S3 or
 * Cloudinary driver can implement the same interface later:
 *   save(buffer, { extension }) -> { key, url }
 *   remove(key)
 *   getUrl(key)
 * `key` is a forward-slash path relative to the storage root, e.g. "2026/01/<uuid>.webp".
 */

export const UPLOAD_ROOT = path.resolve(env.UPLOAD_DIR);
export const UPLOAD_URL_PATH = '/uploads';

function resolveInsideRoot(key) {
  const fullPath = path.resolve(UPLOAD_ROOT, key);
  if (!fullPath.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return fullPath;
}

const localDriver = {
  getUrl(key) {
    return `${env.API_URL.replace(/\/+$/, '')}${UPLOAD_URL_PATH}/${key}`;
  },

  async save(buffer, { extension }) {
    const now = new Date();
    const folder = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    const key = `${folder}/${randomUUID()}.${extension}`;

    await mkdir(path.join(UPLOAD_ROOT, folder), { recursive: true });
    await writeFile(resolveInsideRoot(key), buffer);
    return { key, url: this.getUrl(key) };
  },

  async remove(key) {
    try {
      await unlink(resolveInsideRoot(key));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  },
};

export const storage = localDriver;
