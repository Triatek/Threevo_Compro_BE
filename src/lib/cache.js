import { env } from '../config/env.js';

/**
 * Simple in-memory cache (Map + TTL) for read-heavy public endpoints.
 * NOTE: every Node process has its own cache. Use Redis when running more than one instance.
 */

/** Key names / prefixes, so invalidation uses the same strings as reads. */
export const CacheKeys = Object.freeze({
  SITE: 'site',
  SERVICES: 'services:',
  LOCATIONS: 'locations:',
  CATEGORIES: 'categories',
  ARTICLES: 'articles:',
  TRACKING: 'tracking:',
});

const store = new Map();
const pending = new Map();

export function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function set(key, value, ttlSeconds = env.CACHE_TTL_SECONDS) {
  if (ttlSeconds <= 0) return value;
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  return value;
}

export function del(key) {
  store.delete(key);
}

export function delByPrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/** Remove every key that starts with one of the given prefixes. */
export function invalidate(...prefixes) {
  for (const prefix of prefixes) delByPrefix(prefix);
}

export function clear() {
  store.clear();
  pending.clear();
}

/**
 * Return the cached value or compute it with `fn`. Concurrent callers for the
 * same key share one computation.
 */
export async function wrap(key, ttlSeconds, fn) {
  const cached = get(key);
  if (cached !== undefined) return cached;
  if (pending.has(key)) return pending.get(key);

  const promise = (async () => {
    try {
      return set(key, await fn(), ttlSeconds);
    } finally {
      pending.delete(key);
    }
  })();
  pending.set(key, promise);
  return promise;
}
