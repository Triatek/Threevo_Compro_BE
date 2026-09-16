import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { loginLimiter } from '../../middlewares/rateLimiter.js';
import { validate } from '../../middlewares/validate.js';
import * as authController from './auth.controller.js';
import { changePasswordSchema, loginSchema } from './auth.schema.js';

const router = Router();

router.post('/login', loginLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);
router.patch(
  '/me/password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);

export default router;
