import { Router } from "express";
import { InactivityController } from "../controllers/inactivity-controller";
import { authenticateJWT, requireAuth } from "../middleware/auth";
import { ActivityMiddleware } from "../middleware/activity-middleware";

const router = Router();

// All inactivity routes require authentication
router.use(authenticateJWT);
router.use(requireAuth);

// Track settings access for all routes
router.use(ActivityMiddleware.trackSettingsAccess());

/**
 * Get user's inactivity settings
 * GET /api/v1/inactivity/settings
 */
router.get("/settings", InactivityController.getSettings);

/**
 * Update user's inactivity threshold
 * PUT /api/v1/inactivity/threshold
 * 
 * Body:
 * {
 *   "threshold_days": 90
 * }
 */
router.put(
  "/threshold",
  InactivityController.updateThresholdValidation,
  InactivityController.updateThreshold
);

/**
 * Update user's notification methods
 * PUT /api/v1/inactivity/notifications
 * 
 * Body:
 * {
 *   "notification_methods": ["email", "sms"]
 * }
 */
router.put(
  "/notifications",
  InactivityController.updateNotificationMethodsValidation,
  InactivityController.updateNotificationMethods
);

export default router;