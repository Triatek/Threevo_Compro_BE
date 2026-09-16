import { z } from '../../config/zod.js';

export const awbParamSchema = z.object({
  awb: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{6,30}$/, 'Nomor resi harus 6-30 karakter huruf atau angka')
    .toUpperCase(),
});
