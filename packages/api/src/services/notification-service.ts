import { DatabaseConnection } from "@handoverkey/database";
import {
  NotificationService as INotificationService,
  NotificationResult,
  ReminderType,
  NotificationMethod,
  DeliveryStatus,
  CheckInValidation,
} from "@handoverkey/shared/src/types/dead-mans-switch";
import { createHash, randomBytes } from "crypto";

export class NotificationService implements INotificationService {
  private static readonly CHECK_IN_SECRET =
    process.env.CHECK_IN_SECRET ||
    "default-checkin-secret-change-in-production";

  /**
   * Sends a reminder notification to a user
   */
  async sendReminder(
    userId: string,
    reminderType: ReminderType,
  ): Promise<NotificationResult> {
    try {
      // Get user's notification preferences
      await this.getUserNotificationSettings(userId);
      const user = await this.getUserById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      // Generate check-in link for the reminder
      const checkInLink = await this.generateCheckInLink(
        userId,
        7 * 24 * 60 * 60 * 1000,
      ); // 7 days

      // Create notification content based on reminder type
      const content = this.createReminderContent(
        reminderType,
        user.email,
        checkInLink,
      );

      // Send via primary notification method (email for now)
      const result = await this.sendEmailNotification(
        user.email,
        content.subject,
        content.body,
      );

      // Record the notification delivery
      await this.recordNotificationDelivery({
        userId,
        notificationType: reminderType,
        method: NotificationMethod.EMAIL,
        recipient: user.email,
        status: result.status,
        errorMessage: result.errorMessage,
      });

      return {
        id: result.id,
        userId,
        method: NotificationMethod.EMAIL,
        status: result.status,
        timestamp: new Date(),
        retryCount: 0,
        errorMessage: result.errorMessage,
      };
    } catch (error) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== "test") {
        console.error(
          `Failed to send ${reminderType} reminder to user ${userId}:`,
          error,
        );
      }

      // Record failed delivery
      await this.recordNotificationDelivery({
        userId,
        notificationType: reminderType,
        method: NotificationMethod.EMAIL,
        recipient: "unknown",
        status: DeliveryStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        id: `failed-${Date.now()}`,
        userId,
        method: NotificationMethod.EMAIL,
        status: DeliveryStatus.FAILED,
        timestamp: new Date(),
        retryCount: 0,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Sends handover alerts to successors
   */
  async sendHandoverAlert(
    userId: string,
    successors: string[],
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const successorId of successors) {
      try {
        const successor = await this.getSuccessorById(successorId);
        if (!successor) {
          // Only log errors in non-test environments
          if (process.env.NODE_ENV !== "test") {
            console.error(`Successor ${successorId} not found`);
          }
          continue;
        }

        const content = this.createHandoverAlertContent(
          successor.name,
          successor.email,
        );

        const result = await this.sendEmailNotification(
          successor.email,
          content.subject,
          content.body,
        );

        await this.recordNotificationDelivery({
          userId,
          notificationType: ReminderType.HANDOVER_INITIATED,
          method: NotificationMethod.EMAIL,
          recipient: successor.email,
          status: result.status,
          errorMessage: result.errorMessage,
        });

        results.push({
          id: result.id,
          userId,
          method: NotificationMethod.EMAIL,
          status: result.status,
          timestamp: new Date(),
          retryCount: 0,
          errorMessage: result.errorMessage,
        });
      } catch (error) {
        // Only log errors in non-test environments
        if (process.env.NODE_ENV !== "test") {
          console.error(
            `Failed to send handover alert to successor ${successorId}:`,
            error,
          );
        }

        results.push({
          id: `failed-${Date.now()}-${successorId}`,
          userId,
          method: NotificationMethod.EMAIL,
          status: DeliveryStatus.FAILED,
          timestamp: new Date(),
          retryCount: 0,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Generates a secure check-in link
   */
  async generateCheckInLink(
    userId: string,
    expiresIn: number,
  ): Promise<string> {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + expiresIn);

    // Store the token hash in database
    const query = `
      INSERT INTO checkin_tokens (user_id, token_hash, expires_at, created_at)
      VALUES ($1, $2, $3, NOW())
    `;

    await DatabaseConnection.query(query, [userId, tokenHash, expiresAt]);

    // Return the check-in URL (token is not hashed in URL)
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    return `${baseUrl}/checkin?token=${token}`;
  }

  /**
   * Validates a check-in link token
   */
  async validateCheckInLink(token: string): Promise<CheckInValidation> {
    try {
      const tokenHash = createHash("sha256").update(token).digest("hex");

      const query = `
        SELECT user_id, expires_at, used_at 
        FROM checkin_tokens 
        WHERE token_hash = $1
      `;

      const result = await DatabaseConnection.query(query, [tokenHash]);

      if (result.rows.length === 0) {
        return {
          isValid: false,
          error: "Invalid check-in token",
        };
      }

      const tokenData = result.rows[0];

      // Check if token is expired
      if (new Date() > new Date(tokenData.expires_at)) {
        return {
          isValid: false,
          error: "Check-in token has expired",
        };
      }

      // Check if token has already been used
      if (tokenData.used_at) {
        return {
          isValid: false,
          error: "Check-in token has already been used",
        };
      }

      return {
        isValid: true,
        userId: tokenData.user_id,
        remainingTime: new Date(tokenData.expires_at).getTime() - Date.now(),
      };
    } catch (error) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== "test") {
        console.error("Error validating check-in token:", error);
      }
      return {
        isValid: false,
        error: "Failed to validate check-in token",
      };
    }
  }

  /**
   * Marks a check-in token as used
   */
  async markCheckInTokenUsed(
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const query = `
      UPDATE checkin_tokens 
      SET used_at = NOW(), ip_address = $2, user_agent = $3
      WHERE token_hash = $1
    `;

    await DatabaseConnection.query(query, [tokenHash, ipAddress, userAgent]);
  }

  /**
   * Private helper methods
   */
  private async sendEmailNotification(
    to: string,
    subject: string,
    body: string,
  ): Promise<{ id: string; status: DeliveryStatus; errorMessage?: string }> {
    // TODO: Implement actual email sending (SendGrid, AWS SES, etc.)
    // For now, just log and simulate success
    console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
    console.log(`[EMAIL] Body: ${body.substring(0, 100)}...`);

    // Simulate email sending
    const randomId = randomBytes(6).toString("hex");
    return {
      id: `email-${Date.now()}-${randomId}`,
      status: DeliveryStatus.SENT,
    };
  }

  private createReminderContent(
    reminderType: ReminderType,
    userEmail: string,
    checkInLink: string,
  ): { subject: string; body: string } {
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    switch (reminderType) {
      case ReminderType.FIRST_REMINDER:
        return {
          subject: "HandoverKey Activity Reminder - 75% Threshold Reached",
          body: `
Hello,

This is a friendly reminder that your HandoverKey account has been inactive for a while. 
You've reached 75% of your configured inactivity threshold.

To reset your activity timer, you can either:
1. Log into your HandoverKey account: ${baseUrl}/login
2. Use this secure check-in link: ${checkInLink}

If you don't take any action, you'll receive additional reminders as you approach your handover threshold.

Best regards,
The HandoverKey Team
          `.trim(),
        };

      case ReminderType.SECOND_REMINDER:
        return {
          subject: "HandoverKey Activity Reminder - 85% Threshold Reached",
          body: `
Hello,

Your HandoverKey account has been inactive for an extended period. 
You've now reached 85% of your configured inactivity threshold.

IMPORTANT: Please take action soon to prevent automatic handover of your digital assets.

To reset your activity timer:
1. Log into your HandoverKey account: ${baseUrl}/login
2. Use this secure check-in link: ${checkInLink}

Best regards,
The HandoverKey Team
          `.trim(),
        };

      case ReminderType.FINAL_WARNING:
        return {
          subject: "URGENT: HandoverKey Final Warning - 95% Threshold Reached",
          body: `
URGENT NOTICE

Your HandoverKey account has reached 95% of your inactivity threshold. 
If you don't take action soon, the automatic handover process will begin.

IMMEDIATE ACTION REQUIRED:
1. Log into your HandoverKey account: ${baseUrl}/login
2. Use this secure check-in link: ${checkInLink}

If you're unable to access your account, please contact support immediately.

Best regards,
The HandoverKey Team
          `.trim(),
        };

      default:
        return {
          subject: "HandoverKey Activity Reminder",
          body: `
Hello,

This is a reminder about your HandoverKey account activity.

To reset your activity timer, please log in: ${baseUrl}/login
Or use this secure check-in link: ${checkInLink}

Best regards,
The HandoverKey Team
          `.trim(),
        };
    }
  }

  private createHandoverAlertContent(
    successorName: string,
    _successorEmail: string,
  ): { subject: string; body: string } {
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    return {
      subject: "HandoverKey: Digital Asset Handover Initiated",
      body: `
Dear ${successorName},

A HandoverKey user has designated you as a successor for their digital assets. 
The handover process has been initiated due to prolonged inactivity.

Next steps:
1. Visit HandoverKey: ${baseUrl}
2. Follow the successor verification process
3. Access the encrypted digital assets once verified

If you believe this is an error or have questions, please contact HandoverKey support.

Best regards,
The HandoverKey Team
      `.trim(),
    };
  }

  private async getUserNotificationSettings(userId: string) {
    const query =
      "SELECT notification_methods FROM inactivity_settings WHERE user_id = $1";
    const result = await DatabaseConnection.query(query, [userId]);

    if (result.rows.length === 0) {
      return { notificationMethods: ["email"] };
    }

    return {
      notificationMethods: result.rows[0].notification_methods || ["email"],
    };
  }

  private async getUserById(userId: string) {
    const query = "SELECT id, email FROM users WHERE id = $1";
    const result = await DatabaseConnection.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      id: result.rows[0].id,
      email: result.rows[0].email,
    };
  }

  private async getSuccessorById(successorId: string) {
    const query = "SELECT id, name, email FROM successors WHERE id = $1";
    const result = await DatabaseConnection.query(query, [successorId]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
      email: result.rows[0].email,
    };
  }

  private async recordNotificationDelivery(delivery: {
    userId: string;
    notificationType: ReminderType;
    method: NotificationMethod;
    recipient: string;
    status: DeliveryStatus;
    errorMessage?: string;
  }): Promise<void> {
    const query = `
      INSERT INTO notification_deliveries (
        user_id, notification_type, method, recipient, 
        status, error_message, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;

    await DatabaseConnection.query(query, [
      delivery.userId,
      delivery.notificationType,
      delivery.method,
      delivery.recipient,
      delivery.status,
      delivery.errorMessage,
    ]);
  }
}
