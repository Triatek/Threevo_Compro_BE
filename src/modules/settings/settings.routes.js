import { Router } from 'express';
import { requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import * as settingsController from './settings.controller.js';
import { updateSettingsSchema } from './settings.schema.js';

const router = Router();

router.use(requireRole('SUPER_ADMIN'));

router.get('/', settingsController.getAll);
router.put('/', validate({ body: updateSettingsSchema }), settingsController.update);

export default router;
