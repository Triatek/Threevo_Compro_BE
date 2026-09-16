import { logger } from '../../../lib/logger.js';
import { AppError } from '../../../utils/AppError.js';
import { buildTrackingResult } from '../tracking.format.js';

export function trackingUnavailableError() {
  return new AppError('Layanan cek resi sedang tidak tersedia, silakan coba beberapa saat lagi', {
    statusCode: 502,
    code: 'TRACKING_UNAVAILABLE',
  });
}

// TODO(TMS): replace with the real status codes of the TMS API.
const STATUS_MAP = {
  CREATED: 'PENDING',
  PENDING: 'PENDING',
  PICKUP: 'PICKED_UP',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  ON_PROCESS: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED_DELIVERY',
  RETURNED: 'RETURNED',
};

function mapStatus(value) {
  return STATUS_MAP[String(value ?? '').toUpperCase()] ?? 'UNKNOWN';
}

/**
 * Convert the TMS API response into the normalized format.
 *
 * TODO(TMS): the real API format is not known yet. This mapping assumes:
 * {
 *   "data": {
 *     "awb": "...", "status": "IN_TRANSIT", "origin": "...", "destination": "...",
 *     "estimated_delivery": "ISO date",
 *     "history": [{ "date": "ISO", "status": "...", "location": "...", "description": "..." }]
 *   }
 * }
 * Adjust ONLY this function (and STATUS_MAP) once the documentation is available.
 */
export function normalize(payload, requestedAwb) {
  const data = payload?.data ?? payload;
  if (!data || typeof data !== 'object') {
    throw new Error('Unexpected tracking payload');
  }

  const history = Array.isArray(data.history) ? data.history : [];
  return buildTrackingResult({
    awb: data.awb ?? requestedAwb,
    status: mapStatus(data.status),
    origin: data.origin,
    destination: data.destination,
    estimatedDelivery: data.estimated_delivery ?? data.estimatedDelivery,
    history: history.map((event) => ({
      timestamp: event.date ?? event.timestamp,
      status: mapStatus(event.status),
      location: event.location,
      description: event.description ?? event.note,
    })),
  });
}

/**
 * Provider that calls the external TMS API. The API key never leaves the server.
 * @param {{ baseUrl: string, apiKey?: string, timeoutMs: number, fetchImpl?: typeof fetch }} options
 */
export function createHttpProvider({ baseUrl, apiKey, timeoutMs, fetchImpl = fetch }) {
  return {
    name: 'http',

    async track(awb) {
      const url = `${baseUrl.replace(/\/+$/, '')}/${encodeURIComponent(awb)}`;

      let response;
      try {
        response = await fetchImpl(url, {
          headers: {
            Accept: 'application/json',
            // TODO(TMS): confirm the authentication header name.
            ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
          },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        logger.error({ err, awb, timedOut: err?.name === 'TimeoutError' }, 'Tracking API request failed');
        throw trackingUnavailableError();
      }

      if (response.status === 404) return null;
      if (!response.ok) {
        logger.error({ awb, status: response.status }, 'Tracking API returned an error');
        throw trackingUnavailableError();
      }

      try {
        return normalize(await response.json(), awb);
      } catch (err) {
        logger.error({ err, awb }, 'Tracking API returned an unexpected response');
        throw trackingUnavailableError();
      }
    },
  };
}
