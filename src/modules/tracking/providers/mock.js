import { buildTrackingResult } from '../tracking.format.js';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Mock provider for development and tests.
 * - AWB starting with "TEST" returns sample data ("TESTDLV..." = delivered).
 * - Anything else is "not found".
 */
export function createMockProvider() {
  return {
    name: 'mock',

    async track(awb) {
      if (!awb.startsWith('TEST')) return null;

      const now = Date.now();
      const at = (hoursAgo) => new Date(now - hoursAgo * HOUR_MS);
      const delivered = awb.startsWith('TESTDLV');

      const history = [
        { timestamp: at(48), status: 'PENDING', location: 'Gudang Threevo Cakung', description: 'Pesanan diterima dan sedang diproses' },
        { timestamp: at(40), status: 'PICKED_UP', location: 'Gudang Threevo Cakung', description: 'Paket telah dijemput kurir' },
        { timestamp: at(30), status: 'IN_TRANSIT', location: 'Hub Jakarta', description: 'Paket dalam perjalanan ke kota tujuan' },
      ];
      if (delivered) {
        history.push(
          { timestamp: at(6), status: 'OUT_FOR_DELIVERY', location: 'Hub Bandung', description: 'Paket sedang diantar ke alamat penerima' },
          { timestamp: at(2), status: 'DELIVERED', location: 'Bandung', description: 'Paket diterima oleh penerima' },
        );
      }

      return buildTrackingResult({
        awb,
        status: delivered ? 'DELIVERED' : 'IN_TRANSIT',
        origin: 'Jakarta',
        destination: 'Bandung',
        estimatedDelivery: delivered ? null : new Date(now + 24 * HOUR_MS),
        history,
      });
    },
  };
}
