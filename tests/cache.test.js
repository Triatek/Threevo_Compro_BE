import { afterEach, describe, expect, it, vi } from 'vitest';
import * as cache from '../src/lib/cache.js';

describe('lib/cache', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores values until the TTL expires', () => {
    vi.useFakeTimers();
    cache.set('a', 1, 10);
    expect(cache.get('a')).toBe(1);

    vi.advanceTimersByTime(10_001);
    expect(cache.get('a')).toBeUndefined();
  });

  it('deletes by key and by prefix', () => {
    cache.set('articles:list:1', 1, 60);
    cache.set('articles:list:2', 2, 60);
    cache.set('site', 3, 60);

    cache.delByPrefix('articles:');
    expect(cache.get('articles:list:1')).toBeUndefined();
    expect(cache.get('site')).toBe(3);

    cache.del('site');
    expect(cache.get('site')).toBeUndefined();
  });

  it('wrap computes once and shares concurrent calls', async () => {
    const fn = vi.fn(async () => 'value');

    const [a, b] = await Promise.all([cache.wrap('k', 60, fn), cache.wrap('k', 60, fn)]);
    const c = await cache.wrap('k', 60, fn);

    expect([a, b, c]).toEqual(['value', 'value', 'value']);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('wrap does not cache errors', async () => {
    const failing = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue('ok');

    await expect(cache.wrap('e', 60, failing)).rejects.toThrow('boom');
    await expect(cache.wrap('e', 60, failing)).resolves.toBe('ok');
  });
});
