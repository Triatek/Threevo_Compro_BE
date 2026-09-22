import { z } from '../../config/zod.js';
import { emailSchema } from '../../utils/commonSchemas.js';

/** Password rules for new passwords (bcrypt only uses the first 72 bytes). */
export const newPasswordSchema = z
  .string()
  .min(8)
  .max(72)
  .regex(/[A-Za-z]/, 'Password harus mengandung huruf')
  .regex(/\d/, 'Password harus mengandung angka');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: newPasswordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    message: 'Password baru harus berbeda dari password lama',
  });
