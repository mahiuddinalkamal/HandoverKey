import { Request, Response, NextFunction } from "express";
import { ActivityService } from "../services/activity-service";
import { ActivityType, ClientType } from "@handoverkey/shared/src/types/dead-mans-switch";
import { AuthenticatedRequest } from "./auth";

export class ActivityMiddleware {
  private static activityService = new ActivityService();

  /**
   * Middleware to automatically track user activity
   */
  static trackActivity(activityType: ActivityType = ActivityType.API_REQUEST) {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction,
    ) => {
      try {
        // Only track activity for authenticated users
        if (!req.user?.userId) {
          return next();
        }

        // Skip tracking for health checks and other noise
        if (ActivityMiddleware.shouldSkipTracking(req)) {
          return next();
        }

        const clientType = ActivityMiddleware.detectClientType(req);
        const metadata = ActivityMiddleware.extractMetadata(req, activityType);

        // Record activity asynchronously to avoid blocking the request
        process.nextTick(async () => {
          try {
            await ActivityMiddleware.activityService.recordActivity(
              req.user!.userId,
              activityType,
              metadata,
              clientType,
              req.ip,
              req.get("User-Agent"),
            );
          } catch (error) {
            console.error("Failed to record activity:", error);
            // Don't fail the request if activity tracking fails
          }
        });

        next();
      } catch (error) {
        console.error("Activity middleware error:", error);
        // Don't fail the request if activity tracking fails
        next();
      }
    };
  }

  /**
   * Middleware specifically for login activity
   */
  static trackLogin() {
    return ActivityMiddleware.trackActivity(ActivityType.LOGIN);
  }

  /**
   * Middleware specifically for vault access
   */
  static trackVaultAccess() {
    return ActivityMiddleware.trackActivity(ActivityType.VAULT_ACCESS);
  }

  /**
   * Middleware specifically for settings changes
   */
  static trackSettingsChange() {
    return ActivityMiddleware.trackActivity(ActivityType.SETTINGS_CHANGE);
  }

  /**
   * Middleware specifically for successor management
   */
  static trackSuccessorManagement() {
    return ActivityMiddleware.trackActivity(ActivityType.SUCCESSOR_MANAGEMENT);
  }

  /**
   * Manual check-in endpoint handler
   */
  static async handleManualCheckIn(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const clientType = ActivityMiddleware.detectClientType(req);

      await ActivityMiddleware.activityService.recordActivity(
        req.user.userId,
        ActivityType.MANUAL_CHECKIN,
        {
          manual: true,
          timestamp: new Date().toISOString(),
          source: "manual_checkin_endpoint",
        },
        clientType,
        req.ip,
        req.get("User-Agent"),
      );

      // Get updated activity status
      const activityStatus =
        await ActivityMiddleware.activityService.getUserActivityStatus(
          req.user.userId,
        );

      res.json({
        success: true,
        message: "Check-in recorded successfully",
        activityStatus: {
          lastActivity: activityStatus.lastActivity,
          timeRemaining: activityStatus.timeRemaining,
          thresholdPercentage: activityStatus.thresholdPercentage,
          handoverStatus: activityStatus.handoverStatus,
        },
      });
    } catch (error) {
      console.error("Manual check-in error:", error);
      res.status(500).json({ error: "Failed to record check-in" });
    }
  }

  /**
   * Get activity status endpoint handler
   */
  static async getActivityStatus(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const activityStatus =
        await ActivityMiddleware.activityService.getUserActivityStatus(
          req.user.userId,
        );

      res.json({
        activityStatus: {
          lastActivity: activityStatus.lastActivity,
          inactivityDuration: activityStatus.inactivityDuration,
          thresholdPercentage: activityStatus.thresholdPercentage,
          nextReminderDue: activityStatus.nextReminderDue,
          handoverStatus: activityStatus.handoverStatus,
          timeRemaining: activityStatus.timeRemaining,
        },
      });
    } catch (error) {
      console.error("Get activity status error:", error);
      res.status(500).json({ error: "Failed to get activity status" });
    }
  }

  /**
   * Get activity history endpoint handler
   */
  static async getActivityHistory(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const {
        limit = 50,
        offset = 0,
        startDate,
        endDate,
        activityTypes,
      } = req.query;

      const parsedLimit = Math.min(parseInt(limit as string) || 50, 100);
      const parsedOffset = parseInt(offset as string) || 0;
      const parsedStartDate = startDate
        ? new Date(startDate as string)
        : undefined;
      const parsedEndDate = endDate ? new Date(endDate as string) : undefined;
      const parsedActivityTypes = activityTypes
        ? ((activityTypes as string).split(",") as ActivityType[])
        : undefined;

      const result =
        await ActivityMiddleware.activityService.getActivityHistory(
          req.user.userId,
          parsedLimit,
          parsedOffset,
          parsedStartDate,
          parsedEndDate,
          parsedActivityTypes,
        );

      res.json({
        activities: result.activities,
        total: result.total,
        hasMore: result.total > parsedOffset + result.activities.length,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          total: result.total,
        },
      });
    } catch (error) {
      console.error("Get activity history error:", error);
      res.status(500).json({ error: "Failed to get activity history" });
    }
  }

  /**
   * Private helper methods
   */
  private static shouldSkipTracking(req: Request): boolean {
    const skipPaths = ["/health", "/metrics", "/favicon.ico"];

    const skipMethods = ["OPTIONS"];

    return (
      skipPaths.some((path) => req.path.includes(path)) ||
      skipMethods.includes(req.method)
    );
  }

  private static detectClientType(req: Request): ClientType {
    const userAgent = req.get("User-Agent") || "";
    const clientHeader = req.get("X-Client-Type");

    if (clientHeader) {
      switch (clientHeader.toLowerCase()) {
        case "mobile":
          return ClientType.MOBILE;
        case "cli":
          return ClientType.CLI;
        case "web":
          return ClientType.WEB;
        default:
          return ClientType.API;
      }
    }

    // Detect based on User-Agent
    if (userAgent.includes("HandoverKey-CLI")) {
      return ClientType.CLI;
    } else if (userAgent.includes("HandoverKey-Mobile")) {
      return ClientType.MOBILE;
    } else if (
      userAgent.includes("Mozilla") ||
      userAgent.includes("Chrome") ||
      userAgent.includes("Safari")
    ) {
      return ClientType.WEB;
    }

    return ClientType.API;
  }

  private static extractMetadata(
    req: Request,
    activityType: ActivityType,
  ): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      endpoint: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    };

    // Add activity-specific metadata
    switch (activityType) {
      case ActivityType.VAULT_ACCESS:
        if (req.params.id) {
          metadata.vaultEntryId = req.params.id;
        }
        metadata.action = ActivityMiddleware.getVaultAction(
          req.method,
          req.path,
        );
        break;

      case ActivityType.SETTINGS_CHANGE:
        metadata.settingsType = ActivityMiddleware.getSettingsType(req.path);
        break;

      case ActivityType.SUCCESSOR_MANAGEMENT:
        if (req.params.id) {
          metadata.successorId = req.params.id;
        }
        metadata.action = ActivityMiddleware.getSuccessorAction(
          req.method,
          req.path,
        );
        break;

      case ActivityType.LOGIN:
        metadata.loginMethod = req.body?.twoFactorCode ? "2fa" : "password";
        break;

      default:
        break;
    }

    return metadata;
  }

  private static getVaultAction(method: string, path: string): string {
    if (method === "GET" && path.includes("/entries/")) {
      return "view_entry";
    } else if (method === "GET") {
      return "list_entries";
    } else if (method === "POST") {
      return "create_entry";
    } else if (method === "PUT") {
      return "update_entry";
    } else if (method === "DELETE") {
      return "delete_entry";
    }
    return "unknown";
  }

  private static getSettingsType(path: string): string {
    if (path.includes("/profile")) {
      return "profile";
    } else if (path.includes("/inactivity")) {
      return "inactivity";
    } else if (path.includes("/notifications")) {
      return "notifications";
    }
    return "general";
  }

  private static getSuccessorAction(method: string, path: string): string {
    if (method === "GET" && path.includes("/successors/")) {
      return "view_successor";
    } else if (method === "GET") {
      return "list_successors";
    } else if (method === "POST") {
      return "add_successor";
    } else if (method === "PUT") {
      return "update_successor";
    } else if (method === "DELETE") {
      return "remove_successor";
    }
    return "unknown";
  }
}
