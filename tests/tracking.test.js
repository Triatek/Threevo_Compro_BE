import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/utils/AppError.js';
import { createHttpProvider, normalize } from '../src/modules/tracking/providers/http.js';
import { getTrackingProvider } from '../src/modules/tracking/tracking.service.js';
import { api, request } from './helpers.js';

describe('GET /tracking/:awb (mock provider)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns normalized data for TEST resi', async () => {
    const res = await request().get(api('/tracking/test123456'));

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data).toMatchObject({
      awb: 'TEST123456',
      status: 'IN_TRANSIT',
      statusLabel: 'Dalam perjalanan',
      origin: 'Jakarta',
      destination: 'Bandung',
    });
    expect(new Date(data.estimatedDelivery).toISOString()).toBe(data.estimatedDelivery);
    expect(data.history.length).toBeGreaterThan(0);
    expect(data.history[0]).toEqual({
      timestamp: expect.any(String),
      status: expect.any(String),
      location: expect.any(String),
      description: expect.any(String),
    });
    // Newest first
    const times = data.history.map((h) => h.timestamp);
    expect([...times].sort().reverse()).toEqual(times);
  });

  it('returns DELIVERED for TESTDLV resi', async () => {
    const res = await request().get(api('/tracking/TESTDLV0001'));
    expect(res.body.data).toMatchObject({ status: 'DELIVERED', estimatedDelivery: null });
  });

  it('returns 404 for unknown resi and 422 for invalid format', async () => {
    const notFound = await request().get(api('/tracking/ABC123456'));
    expect(notFound.status).toBe(404);
    expect(notFound.body.error.message).toBe('Nomor resi tidak ditemukan');

    for (const awb of ['ABC12', 'ABC-123456', 'A'.repeat(31), 'resi%20123456']) {
      expect((await request().get(api(`/tracking/${awb}`))).status).toBe(422);
    }
  });

  it('caches successful results (case-insensitive key)', async () => {
    const track = vi.spyOn(getTrackingProvider(), 'track');

    await request().get(api('/tracking/TESTCACHE1')).expect(200);
    await request().get(api('/tracking/testcache1')).expect(200);

    expect(track).toHaveBeenCalledTimes(1);
  });

  it('does not cache not-found results', async () => {
    const track = vi.spyOn(getTrackingProvider(), 'track');

    await request().get(api('/tracking/NOTFOUND1')).expect(404);
    await request().get(api('/tracking/NOTFOUND1')).expect(404);

    expect(track).toHaveBeenCalledTimes(2);
  });
});

describe('http tracking provider', () => {
  const jsonResponse = (status, body) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  it('calls the API with the key and normalizes the payload', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        data: {
          awb: 'TMS123456',
          status: 'on_process',
          origin: 'Surabaya',
          destination: 'Medan',
          estimated_delivery: '2026-02-01T10:00:00+07:00',
          history: [
            { date: '2026-01-30T08:00:00Z', status: 'pickup', location: 'Surabaya', note: 'Dijemput' },
            { date: '2026-01-30T12:00:00Z', status: 'weird', location: 'Hub', description: 'Transit' },
          ],
        },
      }),
    );
    const provider = createHttpProvider({ baseUrl: 'https://tms.example.com/track/', apiKey: 'secret', timeoutMs: 1000, fetchImpl });

    const result = await provider.track('TMS123456');

    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://tms.example.com/track/TMS123456');
    expect(options.headers.Authorization).toBe('Bearer secret');
    expect(result).toEqual({
      awb: 'TMS123456',
      status: 'IN_TRANSIT',
      statusLabel: 'Dalam perjalanan',
      origin: 'Surabaya',
      destination: 'Medan',
      estimatedDelivery: '2026-02-01T03:00:00.000Z',
      history: [
        { timestamp: '2026-01-30T12:00:00.000Z', status: 'UNKNOWN', location: 'Hub', description: 'Transit' },
        { timestamp: '2026-01-30T08:00:00.000Z', status: 'PICKED_UP', location: 'Surabaya', description: 'Dijemput' },
      ],
    });
  });

  it('returns null on 404', async () => {
    const provider = createHttpProvider({
      baseUrl: 'https://tms.example.com',
      timeoutMs: 1000,
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse(404, { message: 'not found' })),
    });
    expect(await provider.track('X123456')).toBeNull();
  });

  it.each([
    ['upstream 500', () => Promise.resolve(jsonResponse(500, {}))],
    ['network error', () => Promise.reject(new TypeError('fetch failed'))],
    ['invalid JSON', () => Promise.resolve(new Response('<html>', { status: 200 }))],
  ])('throws 502 TRACKING_UNAVAILABLE on %s', async (_, impl) => {
    const provider = createHttpProvider({ baseUrl: 'https://tms.example.com', timeoutMs: 1000, fetchImpl: vi.fn(impl) });

    const error = await provider.track('X123456').catch((err) => err);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ statusCode: 502, code: 'TRACKING_UNAVAILABLE' });
  });

  it('aborts slow requests after the timeout', async () => {
    const fetchImpl = vi.fn(
      (url, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason));
        }),
    );
    const provider = createHttpProvider({ baseUrl: 'https://tms.example.com', timeoutMs: 50, fetchImpl });

    const started = Date.now();
    const error = await provider.track('SLOW123456').catch((err) => err);

    expect(error.code).toBe('TRACKING_UNAVAILABLE');
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('normalize rejects non-object payloads', () => {
    expect(() => normalize(null, 'X')).toThrow();
  });
});
