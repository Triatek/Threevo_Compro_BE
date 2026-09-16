import { z } from '../../config/zod.js';
import { booleanQuerySchema, emailSchema, partialUpdate } from '../../utils/commonSchemas.js';
import { paginationSchema } from '../../utils/pagination.js';
import { newPasswordSchema } from '../auth/auth.schema.js';

const roleSchema = z.enum(['SUPER_ADMIN', 'EDITOR']);

export const listUsersQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  role: roleSchema.optional(),
  isActive: booleanQuerySchema.optional(),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: newPasswordSchema,
  role: roleSchema.default('EDITOR'),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = partialUpdate(
  z.object({
    name: z.string().trim().min(2).max(100),
    email: emailSchema,
    password: newPasswordSchema,
    role: roleSchema,
    isActive: z.boolean(),
  }),
);
