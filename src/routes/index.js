import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes.js';

const router = Router();

// ---------- Public ----------
router.use('/health', healthRoutes);

// ---------- Auth ----------
// (Phase 1)

// ---------- Admin (requireAuth) ----------
const adminRouter = Router();
// (Phase 1+)
router.use('/admin', adminRouter);

export default router;
