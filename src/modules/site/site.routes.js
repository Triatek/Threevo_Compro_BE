import { Router } from 'express';
import { publicCache } from '../../middlewares/cacheControl.js';
import * as siteController from './site.controller.js';

const router = Router();

router.get('/', publicCache, siteController.getSite);

export default router;
