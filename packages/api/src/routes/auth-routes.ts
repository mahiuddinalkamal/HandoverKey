import { Router } from "express";
import { AuthController } from "../controllers/auth-controller";
import { authenticateJWT, requireAuth } from "../middleware/auth";
import { authRateLimiter } from "../middleware/security";
import { ActivityMiddleware } from "../middleware/activity-middleware";

const router = Router();

// Registration endpoint
router.post(
  "/register",
  authRateLimiter,
  AuthController.registerValidation,
  AuthController.register,
);

// Login endpoint
router.post(
  "/login",
  authRateLimiter,
  AuthController.loginValidation,
  AuthController.login,
  ActivityMiddleware.trackLogin(),
);

// Logout endpoint (requires authentication)
router.post("/logout", authenticateJWT, requireAuth, AuthController.logout);

// Token refresh endpoint
router.post("/refresh", authRateLimiter, AuthController.refreshToken);

// Get user profile (requires authentication)
router.get(
  "/profile",
  authenticateJWT,
  requireAuth,
  ActivityMiddleware.trackActivity(),
  AuthController.getProfile,
);

export default router;
