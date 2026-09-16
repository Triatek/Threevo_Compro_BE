import { Router } from 'express';
import { publicCache } from '../../middlewares/cacheControl.js';
import { trackingLimiter } from '../../middlewares/rateLimiter.js';
import { validate } from '../../middlewares/validate.js';
import * as trackingController from './tracking.controller.js';
import { awbParamSchema } from './tracking.schema.js';

const router = Router();

router.get(
  '/:awb',
  trackingLimiter,
  publicCache,
  validate({ params: awbParamSchema }),
  trackingController.track,
);

export default router;
