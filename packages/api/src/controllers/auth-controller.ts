import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { UserService } from "../services/user-service";
import { JWTManager } from "../auth/jwt";
import { AuthenticatedRequest } from "../middleware/auth";
import { UserRegistration, UserLogin } from "@handoverkey/shared";

export class AuthController {
  static registerValidation = [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("password")
      .isLength({ min: 12 })
      .withMessage("Password must be at least 12 characters long")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      )
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      ),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password confirmation does not match password");
      }
      return true;
    }),
  ];

  static loginValidation = [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("password").notEmpty().withMessage("Password is required"),
  ];

  static async register(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
        return;
      }

      const registration: UserRegistration = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
      };

      const user = await UserService.createUser(registration);

      // Log successful registration
      await UserService.logActivity(
        user.id,
        "USER_REGISTERED",
        req.ip,
        req.get("User-Agent"),
        true,
      );

      // Generate tokens
      const accessToken = JWTManager.generateAccessToken(user.id, user.email);
      const refreshToken = JWTManager.generateRefreshToken(user.id, user.email);

      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: user.id,
          email: user.email,
          twoFactorEnabled: user.twoFactorEnabled,
          createdAt: user.createdAt,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);

      // Log failed registration attempt
      if (req.body.email) {
        try {
          const existingUser = await UserService.findUserByEmail(
            req.body.email,
          );
          if (existingUser) {
            await UserService.logActivity(
              existingUser.id,
              "REGISTRATION_FAILED_DUPLICATE_EMAIL",
              req.ip,
              req.get("User-Agent"),
              false,
              { attemptedEmail: req.body.email },
            );
          }
        } catch (logError) {
          console.error("Failed to log registration error:", logError);
        }
      }

      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
        return;
      }

      const login: UserLogin = {
        email: req.body.email,
        password: req.body.password,
        twoFactorCode: req.body.twoFactorCode,
      };

      const user = await UserService.authenticateUser(login);

      if (!user) {
        // Log failed login attempt
        try {
          const existingUser = await UserService.findUserByEmail(login.email);
          if (existingUser) {
            await UserService.logActivity(
              existingUser.id,
              "LOGIN_FAILED_INVALID_CREDENTIALS",
              req.ip,
              req.get("User-Agent"),
              false,
              { attemptedEmail: login.email },
            );
          }
        } catch (logError) {
          console.error("Failed to log login error:", logError);
        }

        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      // Check 2FA if enabled
      if (user.twoFactorEnabled && !login.twoFactorCode) {
        res.status(401).json({
          error: "Two-factor authentication required",
          requires2FA: true,
        });
        return;
      }

      // Log successful login
      await UserService.logActivity(
        user.id,
        "USER_LOGIN",
        req.ip,
        req.get("User-Agent"),
        true,
      );

      // Generate tokens
      const accessToken = JWTManager.generateAccessToken(user.id, user.email);
      const refreshToken = JWTManager.generateRefreshToken(user.id, user.email);

      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          twoFactorEnabled: user.twoFactorEnabled,
          lastLogin: user.lastLogin,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      // Log logout
      await UserService.logActivity(
        req.user.userId,
        "USER_LOGOUT",
        req.ip,
        req.get("User-Agent"),
        true,
      );

      res.json({ message: "Logout successful" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: "Refresh token is required" });
        return;
      }

      const decoded = JWTManager.verifyToken(refreshToken);
      const user = await UserService.findUserById(decoded.userId);

      if (!user) {
        res.status(401).json({ error: "Invalid refresh token" });
        return;
      }

      // Generate new tokens
      const newAccessToken = JWTManager.generateAccessToken(
        user.id,
        user.email,
      );
      const newRefreshToken = JWTManager.generateRefreshToken(
        user.id,
        user.email,
      );

      res.json({
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(401).json({ error: "Invalid refresh token" });
    }
  }

  static async getProfile(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const user = await UserService.findUserById(req.user.userId);

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          twoFactorEnabled: user.twoFactorEnabled,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
