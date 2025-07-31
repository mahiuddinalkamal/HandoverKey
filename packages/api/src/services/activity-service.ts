import { createHmac } from "crypto";
import { DatabaseConnection } from "@handoverkey/database";
import {
  ActivityRecord,
  ActivityStatus,
  ActivityType,
  ClientType,
  HandoverStatus,
  ActivityTracker,
} from "@handoverkey/shared/src/types/dead-mans-switch";

export class ActivityService implements ActivityTracker {
  private static readonly HMAC_SECRET =
    process.env.ACTIVITY_HMAC_SECRET || "default-secret-change-in-production";
  private static readonly SIGNATURE_ALGORITHM = "sha256";

  /**
   * Records user activity with cryptographic integrity
   */
  async recordActivity(
    userId: string,
    activityType: ActivityType,
    metadata?: Record<string, unknown>,
    clientType: ClientType = ClientType.WEB,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const timestamp = new Date();

    // Create activity data for signature
    const activityData = {
      userId,
      activityType,
      clientType,
      timestamp: timestamp.toISOString(),
      metadata: metadata || {},
    };

    // Generate HMAC signature for integrity
    const signature = this.generateActivitySignature(activityData);

    const query = `
      INSERT INTO activity_records (
        user_id, activity_type, client_type, ip_address, 
        user_agent, metadata, signature, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await DatabaseConnection.query(query, [
      userId,
      activityType,
      clientType,
      ipAddress,
      userAgent,
      JSON.stringify(metadata || {}),
      signature,
      timestamp,
    ]);

    // Also update the user's last_login timestamp for backward compatibility
    if (activityType === ActivityType.LOGIN) {
      await this.updateUserLastLogin(userId);
    }
  }

  /**
   * Gets the most recent activity for a user across all client types
   */
  async getLastActivity(userId: string): Promise<ActivityRecord | null> {
    const query = `
      SELECT * FROM activity_records 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    const result = await DatabaseConnection.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return this.mapRowToActivityRecord(row);
  }

  /**
   * Gets comprehensive activity status for a user
   */
  async getUserActivityStatus(userId: string): Promise<ActivityStatus> {
    const lastActivity = await this.getLastActivity(userId);
    const inactivitySettings = await this.getInactivitySettings(userId);
    const activeHandover = await this.getActiveHandover(userId);

    if (!lastActivity) {
      // User has never been active - use account creation date
      const user = await this.getUserById(userId);
      const createdAt = user?.createdAt || new Date();

      return {
        lastActivity: createdAt,
        inactivityDuration: Date.now() - createdAt.getTime(),
        thresholdPercentage: this.calculateThresholdPercentage(
          Date.now() - createdAt.getTime(),
          inactivitySettings.thresholdDays,
        ),
        nextReminderDue: this.calculateNextReminderDue(
          createdAt,
          inactivitySettings.thresholdDays,
        ),
        handoverStatus: this.determineHandoverStatus(
          Date.now() - createdAt.getTime(),
          inactivitySettings.thresholdDays,
          activeHandover,
        ),
        timeRemaining: this.calculateTimeRemaining(
          createdAt,
          inactivitySettings.thresholdDays,
        ),
      };
    }

    const inactivityDuration = Date.now() - lastActivity.createdAt.getTime();
    const thresholdPercentage = this.calculateThresholdPercentage(
      inactivityDuration,
      inactivitySettings.thresholdDays,
    );

    return {
      lastActivity: lastActivity.createdAt,
      inactivityDuration,
      thresholdPercentage,
      nextReminderDue: this.calculateNextReminderDue(
        lastActivity.createdAt,
        inactivitySettings.thresholdDays,
      ),
      handoverStatus: this.determineHandoverStatus(
        inactivityDuration,
        inactivitySettings.thresholdDays,
        activeHandover,
      ),
      timeRemaining: this.calculateTimeRemaining(
        lastActivity.createdAt,
        inactivitySettings.thresholdDays,
      ),
    };
  }

  /**
   * Pauses activity tracking for a user
   */
  async pauseTracking(
    userId: string,
    reason: string,
    until?: Date,
  ): Promise<void> {
    const query = `
      UPDATE inactivity_settings 
      SET is_paused = true, pause_reason = $2, paused_until = $3, updated_at = NOW()
      WHERE user_id = $1
    `;

    await DatabaseConnection.query(query, [userId, reason, until]);

    // Record the pause as an activity
    await this.recordActivity(userId, ActivityType.SETTINGS_CHANGE, {
      action: "pause_tracking",
      reason,
      until,
    });
  }

  /**
   * Resumes activity tracking for a user
   */
  async resumeTracking(userId: string): Promise<void> {
    const query = `
      UPDATE inactivity_settings 
      SET is_paused = false, pause_reason = NULL, paused_until = NULL, updated_at = NOW()
      WHERE user_id = $1
    `;

    await DatabaseConnection.query(query, [userId]);

    // Record the resume as an activity
    await this.recordActivity(userId, ActivityType.SETTINGS_CHANGE, {
      action: "resume_tracking",
    });
  }

  /**
   * Verifies the integrity of an activity record
   */
  async verifyActivityIntegrity(
    activityRecord: ActivityRecord,
  ): Promise<boolean> {
    const activityData = {
      userId: activityRecord.userId,
      activityType: activityRecord.activityType,
      clientType: activityRecord.clientType,
      timestamp: activityRecord.createdAt.toISOString(),
      metadata: activityRecord.metadata || {},
    };

    const expectedSignature = this.generateActivitySignature(activityData);
    return expectedSignature === activityRecord.signature;
  }

  /**
   * Gets activity history for a user with pagination
   */
  async getActivityHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    startDate?: Date,
    endDate?: Date,
    activityTypes?: ActivityType[],
  ): Promise<{ activities: ActivityRecord[]; total: number }> {
    let whereClause = "WHERE user_id = $1";
    const params: unknown[] = [userId];
    let paramCount = 1;

    if (startDate) {
      paramCount++;
      whereClause += ` AND created_at >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      whereClause += ` AND created_at <= $${paramCount}`;
      params.push(endDate);
    }

    if (activityTypes && activityTypes.length > 0) {
      paramCount++;
      whereClause += ` AND activity_type = ANY($${paramCount})`;
      params.push(activityTypes);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM activity_records ${whereClause}`;
    const countResult = await DatabaseConnection.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const query = `
      SELECT * FROM activity_records 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await DatabaseConnection.query(query, params);
    const activities = result.rows.map((row: unknown) =>
      this.mapRowToActivityRecord(row),
    );

    return { activities, total };
  }

  /**
   * Private helper methods
   */
  private generateActivitySignature(
    activityData: Record<string, unknown>,
  ): string {
    const dataString = JSON.stringify(
      activityData,
      Object.keys(activityData).sort(),
    );
    return createHmac(
      ActivityService.SIGNATURE_ALGORITHM,
      ActivityService.HMAC_SECRET,
    )
      .update(dataString)
      .digest("hex");
  }

  private async updateUserLastLogin(userId: string): Promise<void> {
    const query = "UPDATE users SET last_login = NOW() WHERE id = $1";
    await DatabaseConnection.query(query, [userId]);
  }

  private async getInactivitySettings(userId: string) {
    const query = "SELECT * FROM inactivity_settings WHERE user_id = $1";
    const result = await DatabaseConnection.query(query, [userId]);

    if (result.rows.length === 0) {
      // Return default settings if none exist
      return {
        thresholdDays: 90,
        isPaused: false,
      };
    }

    return {
      thresholdDays: result.rows[0].threshold_days,
      isPaused: result.rows[0].is_paused,
      pausedUntil: result.rows[0].paused_until,
    };
  }

  private async getActiveHandover(userId: string) {
    const query = `
      SELECT * FROM handover_processes 
      WHERE user_id = $1 AND status NOT IN ('completed', 'cancelled')
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const result = await DatabaseConnection.query(query, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  private async getUserById(userId: string) {
    const query = "SELECT * FROM users WHERE id = $1";
    const result = await DatabaseConnection.query(query, [userId]);
    return result.rows.length > 0
      ? {
          id: result.rows[0].id,
          createdAt: result.rows[0].created_at,
        }
      : null;
  }

  private calculateThresholdPercentage(
    inactivityDuration: number,
    thresholdDays: number,
  ): number {
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
    return Math.min((inactivityDuration / thresholdMs) * 100, 100);
  }

  private calculateNextReminderDue(
    lastActivity: Date,
    thresholdDays: number,
  ): Date | null {
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
    const firstReminderThreshold = thresholdMs * 0.75; // 75%

    const timeSinceActivity = Date.now() - lastActivity.getTime();

    if (timeSinceActivity < firstReminderThreshold) {
      return new Date(lastActivity.getTime() + firstReminderThreshold);
    }

    // If we're past 75%, calculate next reminder based on current percentage
    const percentage = (timeSinceActivity / thresholdMs) * 100;

    if (percentage < 85) {
      return new Date(lastActivity.getTime() + thresholdMs * 0.85);
    } else if (percentage < 95) {
      return new Date(lastActivity.getTime() + thresholdMs * 0.95);
    } else if (percentage < 100) {
      return new Date(lastActivity.getTime() + thresholdMs);
    }

    return null; // Past threshold, no more reminders
  }

  private determineHandoverStatus(
    inactivityDuration: number,
    thresholdDays: number,
    activeHandover: unknown,
  ): HandoverStatus {
    if (activeHandover) {
      const handover = activeHandover as { status: string };
      switch (handover.status) {
        case "grace_period":
          return HandoverStatus.GRACE_PERIOD;
        case "awaiting_successors":
        case "verification_pending":
        case "ready_for_transfer":
          return HandoverStatus.HANDOVER_ACTIVE;
        default:
          break;
      }
    }

    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
    const percentage = (inactivityDuration / thresholdMs) * 100;

    if (percentage >= 100) {
      return HandoverStatus.GRACE_PERIOD;
    } else if (percentage >= 75) {
      return HandoverStatus.REMINDER_PHASE;
    }

    return HandoverStatus.NORMAL;
  }

  private calculateTimeRemaining(
    lastActivity: Date,
    thresholdDays: number,
  ): number {
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - lastActivity.getTime();
    return Math.max(0, thresholdMs - elapsed);
  }

  private mapRowToActivityRecord(row: unknown): ActivityRecord {
    const dbRow = row as {
      id: string;
      user_id: string;
      activity_type: string;
      client_type: string;
      ip_address?: string;
      user_agent?: string;
      metadata?: string;
      signature: string;
      created_at: Date;
    };

    return {
      id: dbRow.id,
      userId: dbRow.user_id,
      activityType: dbRow.activity_type as ActivityType,
      clientType: dbRow.client_type as ClientType,
      ipAddress: dbRow.ip_address,
      userAgent: dbRow.user_agent,
      metadata: dbRow.metadata ? JSON.parse(dbRow.metadata) : {},
      signature: dbRow.signature,
      createdAt: dbRow.created_at,
    };
  }
}
