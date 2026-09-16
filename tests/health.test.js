import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, prisma, request } from './helpers.js';

describe('GET /health', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 200 with database status when the database is up', async () => {
    const res = await request().get(api('/health'));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: { status: 'OK', services: { database: 'up' } },
    });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('returns 503 when the database is down', async () => {
    vi.spyOn(prisma, '$queryRaw').mockRejectedValue(new Error('connection refused'));

    const res = await request().get(api('/health'));

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE' },
    });
  });

  it('sets a request id header and reuses a valid incoming one', async () => {
    const generated = await request().get(api('/health'));
    expect(generated.headers['x-request-id']).toMatch(/^[\w-]+$/);

    const reused = await request().get(api('/health')).set('X-Request-Id', 'abc-123');
    expect(reused.headers['x-request-id']).toBe('abc-123');
  });

  it('does not expose x-powered-by', async () => {
    const res = await request().get(api('/health'));
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
