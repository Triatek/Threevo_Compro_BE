import { env } from '../../config/env.js';
import * as cache from '../../lib/cache.js';
import { NotFoundError } from '../../utils/AppError.js';
import { createHttpProvider } from './providers/http.js';
import { createMockProvider } from './providers/mock.js';

const CACHE_TTL_SECONDS = 120;

const provider =
  env.TRACKING_PROVIDER === 'http'
    ? createHttpProvider({
        baseUrl: env.TRACKING_API_URL,
        apiKey: env.TRACKING_API_KEY,
        timeoutMs: env.TRACKING_TIMEOUT_MS,
      })
    : createMockProvider();

/** Exposed for tests (e.g. spying on `track`). */
export function getTrackingProvider() {
  return provider;
}

/** Track a shipment; successful results are cached for 2 minutes. */
export function trackShipment(awb) {
  return cache.wrap(`${cache.CacheKeys.TRACKING}${awb}`, CACHE_TTL_SECONDS, async () => {
    const result = await provider.track(awb);
    if (!result) throw new NotFoundError('Nomor resi tidak ditemukan');
    return result;
  });
}
