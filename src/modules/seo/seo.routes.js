import { Router } from 'express';
import * as seoController from './seo.controller.js';

/** Mounted at the root (outside API_PREFIX). */
const router = Router();

router.get('/sitemap.xml', seoController.sitemap);
router.get('/robots.txt', seoController.robots);

export default router;
