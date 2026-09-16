import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { noStore } from '../middlewares/cacheControl.js';
import auditLogsRoutes from '../modules/auditLogs/auditLogs.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import healthRoutes from '../modules/health/health.routes.js';
import usersRoutes from '../modules/users/users.routes.js';

const router = Router();

// ---------- Public ----------
router.use('/health', healthRoutes);

// ---------- Auth ----------
router.use('/auth', noStore, authRoutes);

// ---------- Admin (login required) ----------
const adminRouter = Router();
adminRouter.use(noStore, requireAuth);

adminRouter.use('/users', usersRoutes);
adminRouter.use('/audit-logs', auditLogsRoutes);

router.use('/admin', adminRouter);

export default router;
