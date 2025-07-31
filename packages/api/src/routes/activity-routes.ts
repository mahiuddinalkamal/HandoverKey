import { Router } from "express";
import { authenticateJWT } from "../middleware/auth";
import { ActivityMiddleware } from "../middleware/activity-middleware";

const router = Router();

// All activity routes require authentication
router.use(authenticateJWT);

/**
 * POST /api/v1/activity/check-in
 * Manual check-in to reset inactivity timer
 */
router.post("/check-in", ActivityMiddleware.handleManualCheckIn);

/**
 * GET /api/v1/activity/status
 * Get current activity status and handover information
 */
router.get("/status", ActivityMiddleware.getActivityStatus);

/**
 * GET /api/v1/activity/history
 * Get activity history with pagination and filtering
 * Query parameters:
 * - limit: number of records (max 100, default 50)
 * - offset: pagination offset (default 0)
 * - startDate: filter activities after this date
 * - endDate: filter activities before this date
 * - activityTypes: comma-separated list of activity types to filter
 */
router.get("/history", ActivityMiddleware.getActivityHistory);

export default router;
