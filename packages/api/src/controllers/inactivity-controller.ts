import { Response } from "express";
import { body, validationResult } from "express-validator";
import { DatabaseConnection } from "@handoverkey/database";
import { ActivityService } from "../services/activity-service";
import { AuthenticatedRequest } from "../middleware/auth";
import { ActivityType } from "@handoverkey/shared/src/types/dead-mans-switch";

export class InactivityController {
  /**
   * Get user's inactivity settings
   */
  static async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      const query = `
        SELECT 
          threshold_days,
          notification_methods,
          emergency_contacts,
          is_paused,
          pause_reason,
          paused_until,
          created_at,
          updated_at
        FROM inactivity_settings 
        WHERE user_id = $1
      `;

      const result = await DatabaseConnection.query(query, [userId]);

      if (result.rows.length === 0) {
        // Create default settings if none exist
        await InactivityController.createDefaultSettings(userId);
        const defaultResult = await DatabaseConnection.query(query, [userId]);
        res.json(defaultResult.rows[0]);
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error getting inactivity settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Update user's inactivity threshold
   */
  static async updateThreshold(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      const { threshold_days } = req.body;

      // Get current settings to log the change
      const currentQuery = "SELECT threshold_days FROM inactivity_settings WHERE user_id = $1";
      const currentResult = await DatabaseConnection.query(currentQuery, [userId]);
      const oldThreshold = currentResult.rows[0]?.threshold_days;

      // Update threshold
      const updateQuery = `
        UPDATE inactivity_settings 
        SET threshold_days = $2, updated_at = NOW()
        WHERE user_id = $1
        RETURNING threshold_days, updated_at
      `;

      const result = await DatabaseConnection.query(updateQuery, [userId, threshold_days]);

      if (result.rows.length === 0) {
        // Create settings if they don't exist
        await InactivityController.createDefaultSettings(userId);
        const retryResult = await DatabaseConnection.query(updateQuery, [userId, threshold_days]);
        
        // Log the threshold change for audit
        await InactivityController.logThresholdChange(userId, null, threshold_days);
        
        res.json({
          message: "Threshold updated successfully",
          threshold_days: retryResult.rows[0].threshold_days,
          updated_at: retryResult.rows[0].updated_at
        });
        return;
      }

      // Log the threshold change for audit
      await InactivityController.logThresholdChange(userId, oldThreshold, threshold_days);

      res.json({
        message: "Threshold updated successfully",
        threshold_days: result.rows[0].threshold_days,
        updated_at: result.rows[0].updated_at
      });
    } catch (error) {
      console.error("Error updating threshold:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Update notification methods
   */
  static async updateNotificationMethods(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      const { notification_methods } = req.body;

      const updateQuery = `
        UPDATE inactivity_settings 
        SET notification_methods = $2, updated_at = NOW()
        WHERE user_id = $1
        RETURNING notification_methods, updated_at
      `;

      const result = await DatabaseConnection.query(updateQuery, [userId, notification_methods]);

      if (result.rows.length === 0) {
        // Create settings if they don't exist
        await InactivityController.createDefaultSettings(userId);
        const retryResult = await DatabaseConnection.query(updateQuery, [userId, notification_methods]);
        
        res.json({
          message: "Notification methods updated successfully",
          notification_methods: retryResult.rows[0].notification_methods,
          updated_at: retryResult.rows[0].updated_at
        });
        return;
      }

      res.json({
        message: "Notification methods updated successfully",
        notification_methods: result.rows[0].notification_methods,
        updated_at: result.rows[0].updated_at
      });
    } catch (error) {
      console.error("Error updating notification methods:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Validation rules for threshold update
   */
  static updateThresholdValidation = [
    body("threshold_days")
      .isInt({ min: 30, max: 365 })
      .withMessage("Threshold must be between 30 and 365 days"),
  ];

  /**
   * Validation rules for notification methods update
   */
  static updateNotificationMethodsValidation = [
    body("notification_methods")
      .isArray({ min: 1 })
      .withMessage("At least one notification method is required"),
    body("notification_methods.*")
      .isIn(["email", "sms", "push"])
      .withMessage("Invalid notification method"),
  ];

  /**
   * Create default inactivity settings for a user
   */
  private static async createDefaultSettings(userId: string): Promise<void> {
    const insertQuery = `
      INSERT INTO inactivity_settings (user_id, threshold_days, notification_methods)
      VALUES ($1, 90, ARRAY['email'])
      ON CONFLICT (user_id) DO NOTHING
    `;
    
    await DatabaseConnection.query(insertQuery, [userId]);
  }

  /**
   * Log threshold changes for audit trail
   */
  private static async logThresholdChange(
    userId: string, 
    oldThreshold: number | null, 
    newThreshold: number
  ): Promise<void> {
    try {
      const activityService = new ActivityService();
      await activityService.recordActivity(
        userId,
        ActivityType.SETTINGS_CHANGE,
        {
          setting: "threshold_days",
          old_value: oldThreshold,
          new_value: newThreshold
        }
      );
    } catch (error) {
      console.error("Error logging threshold change:", error);
      // Don't fail the main operation if logging fails
    }
  }
}