import { DatabaseConnection } from "@handoverkey/database";
import { ActivityService } from "./activity-service";
import { NotificationService } from "./notification-service";
import { HandoverOrchestrator } from "./handover-orchestrator";
import {
  InactivityMonitor,
  ActivityStatus,
  HandoverStatus,
  ReminderType,
  SystemStatusType,
} from "@handoverkey/shared";

export class InactivityMonitorService implements InactivityMonitor {
  private static instance: InactivityMonitorService;
  private activityService: ActivityService;
  private notificationService: NotificationService;
  private handoverOrchestrator: HandoverOrchestrator;
  private isRunning: boolean = false;
  private intervalId: ReturnType<typeof global.setInterval> | null = null;
  private readonly CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.activityService = new ActivityService();
    this.notificationService = new NotificationService();
    this.handoverOrchestrator = new HandoverOrchestrator();
  }

  static getInstance(): InactivityMonitorService {
    if (!InactivityMonitorService.instance) {
      InactivityMonitorService.instance = new InactivityMonitorService();
    }
    return InactivityMonitorService.instance;
  }

  /**
   * Starts the inactivity monitoring service
   */
  start(): void {
    if (this.isRunning) {
      console.log('InactivityMonitor is already running');
      return;
    }

    console.log('Starting InactivityMonitor service...');
    this.isRunning = true;

    // Run initial check
    this.checkAllUsers().catch(error => {
      console.error('Initial inactivity check failed:', error);
    });

    // Schedule periodic checks
    this.intervalId = global.setInterval(() => {
      this.checkAllUsers().catch(error => {
        console.error('Periodic inactivity check failed:', error);
      });
    }, this.CHECK_INTERVAL_MS);

    console.log(`InactivityMonitor started with ${this.CHECK_INTERVAL_MS / 1000}s interval`);
  }

  /**
   * Stops the inactivity monitoring service
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('InactivityMonitor is not running');
      return;
    }

    console.log('Stopping InactivityMonitor service...');
    this.isRunning = false;

    if (this.intervalId) {
      global.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('InactivityMonitor stopped');
  }

  /**
   * Checks inactivity for a specific user
   */
  async checkUserInactivity(userId: string): Promise<void> {
    try {
      // Skip if system is in maintenance mode
      if (await this.isSystemInMaintenance()) {
        return;
      }

      // Skip if user tracking is paused
      if (await this.isUserTrackingPaused(userId)) {
        return;
      }

      const activityStatus = await this.activityService.getUserActivityStatus(userId);
      const inactivitySettings = await this.getInactivitySettings(userId);

      // Adjust for system downtime
      const adjustedStatus = await this.adjustForSystemDowntime(activityStatus);

      await this.processUserInactivity(userId, adjustedStatus, inactivitySettings);
    } catch (error) {
      console.error(`Failed to check inactivity for user ${userId}:`, error);
      // Continue processing other users even if one fails
    }
  }

  /**
   * Checks inactivity for all users
   */
  async checkAllUsers(): Promise<void> {
    try {
      console.log('Running inactivity check for all users...');

      // Get all active users (users with inactivity settings)
      const users = await this.getActiveUsers();
      console.log(`Checking inactivity for ${users.length} users`);

      // Process users in batches to avoid overwhelming the system
      const batchSize = 50;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(user => this.checkUserInactivity(user.id))
        );

        // Small delay between batches
        if (i + batchSize < users.length) {
          await this.delay(1000); // 1 second delay
        }
      }

      console.log('Completed inactivity check for all users');
    } catch (error) {
      console.error('Failed to check inactivity for all users:', error);
    }
  }

  /**
   * Pauses system-wide tracking (for maintenance)
   */
  async pauseSystemTracking(reason: string): Promise<void> {
    try {
      await this.updateSystemStatus(SystemStatusType.MAINTENANCE, reason);
      console.log(`System tracking paused: ${reason}`);
    } catch (error) {
      console.error('Failed to pause system tracking:', error);
      throw error;
    }
  }

  /**
   * Resumes system-wide tracking
   */
  async resumeSystemTracking(): Promise<void> {
    try {
      await this.updateSystemStatus(SystemStatusType.OPERATIONAL, 'System resumed');
      console.log('System tracking resumed');
    } catch (error) {
      console.error('Failed to resume system tracking:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async processUserInactivity(
    userId: string,
    activityStatus: ActivityStatus,
    _inactivitySettings: { thresholdDays: number; notificationMethods: string[] }
  ): Promise<void> {
    const { thresholdPercentage, handoverStatus } = activityStatus;

    // Handle different inactivity levels
    if (thresholdPercentage >= 100) {
      // Past threshold - initiate handover if not already started
      if (handoverStatus !== HandoverStatus.GRACE_PERIOD && handoverStatus !== HandoverStatus.HANDOVER_ACTIVE) {
        await this.handoverOrchestrator.initiateHandover(userId);
        console.log(`Handover initiated for user ${userId} (${thresholdPercentage.toFixed(1)}% inactive)`);
      }
    } else if (thresholdPercentage >= 95) {
      // Final warning (95%)
      await this.sendReminderIfDue(userId, ReminderType.FINAL_WARNING, activityStatus);
    } else if (thresholdPercentage >= 85) {
      // Second reminder (85%)
      await this.sendReminderIfDue(userId, ReminderType.SECOND_REMINDER, activityStatus);
    } else if (thresholdPercentage >= 75) {
      // First reminder (75%)
      await this.sendReminderIfDue(userId, ReminderType.FIRST_REMINDER, activityStatus);
    }

    // Log significant changes
    if (thresholdPercentage >= 75) {
      console.log(`User ${userId}: ${thresholdPercentage.toFixed(1)}% inactive, status: ${handoverStatus}`);
    }
  }

  private async sendReminderIfDue(
    userId: string,
    reminderType: ReminderType,
    _activityStatus: ActivityStatus
  ): Promise<void> {
    try {
      // Check if we've already sent this type of reminder recently
      const lastReminder = await this.getLastReminderSent(userId, reminderType);
      const reminderCooldown = this.getReminderCooldown(reminderType);

      if (lastReminder && (Date.now() - lastReminder.getTime()) < reminderCooldown) {
        return; // Too soon to send another reminder of this type
      }

      // Send the reminder
      const result = await this.notificationService.sendReminder(userId, reminderType);
      
      if (result.status === 'sent' || result.status === 'delivered') {
        console.log(`Sent ${reminderType} reminder to user ${userId}`);
      } else {
        console.error(`Failed to send ${reminderType} reminder to user ${userId}:`, result.errorMessage);
      }
    } catch (error) {
      console.error(`Error sending ${reminderType} reminder to user ${userId}:`, error);
    }
  }

  private async getActiveUsers(): Promise<{ id: string }[]> {
    const query = `
      SELECT DISTINCT u.id 
      FROM users u
      INNER JOIN inactivity_settings i ON u.id = i.user_id
      WHERE i.is_paused = false
      ORDER BY u.id
    `;

    const result = await DatabaseConnection.query(query);
    return result.rows.map((row: { id: string }) => ({ id: row.id }));
  }

  private async getInactivitySettings(userId: string) {
    const query = "SELECT * FROM inactivity_settings WHERE user_id = $1";
    const result = await DatabaseConnection.query(query, [userId]);
    
    if (result.rows.length === 0) {
      // Return default settings
      return {
        thresholdDays: 90,
        notificationMethods: ['email'],
      };
    }

    const row = result.rows[0];
    return {
      thresholdDays: row.threshold_days,
      notificationMethods: row.notification_methods || ['email'],
    };
  }

  private async isSystemInMaintenance(): Promise<boolean> {
    const query = `
      SELECT status FROM system_status 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    const result = await DatabaseConnection.query(query);
    
    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].status === SystemStatusType.MAINTENANCE;
  }

  private async isUserTrackingPaused(userId: string): Promise<boolean> {
    const query = `
      SELECT is_paused, paused_until 
      FROM inactivity_settings 
      WHERE user_id = $1
    `;

    const result = await DatabaseConnection.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return false;
    }

    const row = result.rows[0];
    
    // Check if permanently paused
    if (row.is_paused && !row.paused_until) {
      return true;
    }

    // Check if temporarily paused and still within pause period
    if (row.is_paused && row.paused_until) {
      return new Date() < new Date(row.paused_until);
    }

    return false;
  }

  private async adjustForSystemDowntime(_activityStatus: ActivityStatus): Promise<ActivityStatus> {
    // Get total system downtime since user's last activity
    const downtimeMs = await this.getSystemDowntimeSince(_activityStatus.lastActivity);
    
    if (downtimeMs === 0) {
      return _activityStatus;
    }

    // Adjust the inactivity duration by subtracting downtime
    const adjustedInactivityDuration = Math.max(0, _activityStatus.inactivityDuration - downtimeMs);
    
    // Recalculate other fields based on adjusted duration
    const thresholdMs = _activityStatus.timeRemaining + _activityStatus.inactivityDuration;
    const adjustedThresholdPercentage = Math.min((adjustedInactivityDuration / thresholdMs) * 100, 100);
    const adjustedTimeRemaining = Math.max(0, thresholdMs - adjustedInactivityDuration);

    return {
      ..._activityStatus,
      inactivityDuration: adjustedInactivityDuration,
      thresholdPercentage: adjustedThresholdPercentage,
      timeRemaining: adjustedTimeRemaining,
    };
  }

  private async getSystemDowntimeSince(since: Date): Promise<number> {
    const query = `
      SELECT downtime_start, downtime_end 
      FROM system_status 
      WHERE status IN ('maintenance', 'outage') 
        AND downtime_start >= $1
        AND downtime_end IS NOT NULL
      ORDER BY downtime_start
    `;

    const result = await DatabaseConnection.query(query, [since]);
    
    let totalDowntime = 0;
    
    for (const row of result.rows) {
      const start = new Date(row.downtime_start);
      const end = new Date(row.downtime_end);
      totalDowntime += end.getTime() - start.getTime();
    }

    return totalDowntime;
  }

  private async updateSystemStatus(status: SystemStatusType, reason: string): Promise<void> {
    const now = new Date();
    
    if (status === SystemStatusType.MAINTENANCE || status === SystemStatusType.OUTAGE) {
      // Starting downtime
      const query = `
        INSERT INTO system_status (status, downtime_start, reason, created_at)
        VALUES ($1, $2, $3, $4)
      `;
      await DatabaseConnection.query(query, [status, now, reason, now]);
    } else {
      // Ending downtime - update the most recent downtime record
      const updateQuery = `
        UPDATE system_status 
        SET downtime_end = $1 
        WHERE id = (
          SELECT id FROM system_status 
          WHERE status IN ('maintenance', 'outage') 
            AND downtime_end IS NULL 
          ORDER BY created_at DESC 
          LIMIT 1
        )
      `;
      await DatabaseConnection.query(updateQuery, [now]);

      // Insert new operational status
      const insertQuery = `
        INSERT INTO system_status (status, reason, created_at)
        VALUES ($1, $2, $3)
      `;
      await DatabaseConnection.query(insertQuery, [status, reason, now]);
    }
  }

  private async getLastReminderSent(userId: string, reminderType: ReminderType): Promise<Date | null> {
    const query = `
      SELECT MAX(created_at) as last_sent
      FROM notification_deliveries 
      WHERE user_id = $1 
        AND notification_type = $2 
        AND status IN ('sent', 'delivered')
    `;

    const result = await DatabaseConnection.query(query, [userId, reminderType]);
    
    if (result.rows.length === 0 || !result.rows[0].last_sent) {
      return null;
    }

    return new Date(result.rows[0].last_sent);
  }

  private getReminderCooldown(reminderType: ReminderType): number {
    // Cooldown periods to prevent spam
    switch (reminderType) {
      case ReminderType.FIRST_REMINDER:
        return 24 * 60 * 60 * 1000; // 24 hours
      case ReminderType.SECOND_REMINDER:
        return 12 * 60 * 60 * 1000; // 12 hours
      case ReminderType.FINAL_WARNING:
        return 6 * 60 * 60 * 1000;  // 6 hours
      default:
        return 60 * 60 * 1000; // 1 hour
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => global.setTimeout(resolve, ms));
  }

  /**
   * Health check method
   */
  isHealthy(): boolean {
    return this.isRunning;
  }

  /**
   * Get monitoring statistics
   */
  async getStats(): Promise<{
    isRunning: boolean;
    checkInterval: number;
    activeUsers: number;
    systemStatus: string;
  }> {
    const activeUsers = await this.getActiveUsers();
    const systemStatus = await this.getCurrentSystemStatus();

    return {
      isRunning: this.isRunning,
      checkInterval: this.CHECK_INTERVAL_MS,
      activeUsers: activeUsers.length,
      systemStatus: systemStatus || 'unknown',
    };
  }

  private async getCurrentSystemStatus(): Promise<string | null> {
    const query = `
      SELECT status FROM system_status 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    const result = await DatabaseConnection.query(query);
    return result.rows.length > 0 ? result.rows[0].status : null;
  }
}