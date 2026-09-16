import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { noStore } from '../middlewares/cacheControl.js';
import auditLogsRoutes from '../modules/auditLogs/auditLogs.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import bannersRoutes from '../modules/banners/banners.routes.js';
import clientsRoutes from '../modules/clients/clients.routes.js';
import healthRoutes from '../modules/health/health.routes.js';
import { adminLocationsRouter, publicLocationsRouter } from '../modules/locations/locations.routes.js';
import { adminServicesRouter, publicServicesRouter } from '../modules/services/services.routes.js';
import settingsRoutes from '../modules/settings/settings.routes.js';
import siteRoutes from '../modules/site/site.routes.js';
import testimonialsRoutes from '../modules/testimonials/testimonials.routes.js';
import usersRoutes from '../modules/users/users.routes.js';

const router = Router();

// ---------- Public ----------
router.use('/health', healthRoutes);
router.use('/site', siteRoutes);
router.use('/services', publicServicesRouter);
router.use('/locations', publicLocationsRouter);

// ---------- Auth ----------
router.use('/auth', noStore, authRoutes);

// ---------- Admin (login required) ----------
const adminRouter = Router();
adminRouter.use(noStore, requireAuth);

adminRouter.use('/settings', settingsRoutes);
adminRouter.use('/banners', bannersRoutes);
adminRouter.use('/clients', clientsRoutes);
adminRouter.use('/testimonials', testimonialsRoutes);
adminRouter.use('/services', adminServicesRouter);
adminRouter.use('/locations', adminLocationsRouter);
adminRouter.use('/users', usersRoutes);
adminRouter.use('/audit-logs', auditLogsRoutes);

router.use('/admin', adminRouter);

export default router;
