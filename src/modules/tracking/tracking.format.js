/** Normalized shipment statuses returned to the frontend. */
export const TRACKING_STATUS_LABELS = Object.freeze({
  PENDING: 'Menunggu diproses',
  PICKED_UP: 'Paket telah dijemput',
  IN_TRANSIT: 'Dalam perjalanan',
  OUT_FOR_DELIVERY: 'Sedang diantar ke penerima',
  DELIVERED: 'Paket telah diterima',
  FAILED_DELIVERY: 'Pengiriman gagal',
  RETURNED: 'Dikembalikan ke pengirim',
  UNKNOWN: 'Status tidak diketahui',
});

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeStatus(status) {
  return status in TRACKING_STATUS_LABELS ? status : 'UNKNOWN';
}

/**
 * Build the normalized tracking result:
 * { awb, status, statusLabel, origin, destination, estimatedDelivery, history[] }
 * History is sorted newest first.
 */
export function buildTrackingResult({ awb, status, origin, destination, estimatedDelivery, history = [] }) {
  const finalStatus = normalizeStatus(status);
  return {
    awb,
    status: finalStatus,
    statusLabel: TRACKING_STATUS_LABELS[finalStatus],
    origin: origin ?? null,
    destination: destination ?? null,
    estimatedDelivery: toIsoOrNull(estimatedDelivery),
    history: history
      .map((event) => ({
        timestamp: toIsoOrNull(event.timestamp),
        status: normalizeStatus(event.status),
        location: event.location ?? null,
        description: event.description ?? null,
      }))
      .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? '')),
  };
}
