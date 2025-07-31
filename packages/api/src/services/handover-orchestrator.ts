import { DatabaseConnection } from "@handoverkey/database";
import {
  HandoverOrchestrator as IHandoverOrchestrator,
  HandoverProcess,
  HandoverProcessStatus,
} from "@handoverkey/shared";

export class HandoverOrchestrator implements IHandoverOrchestrator {
  private static readonly GRACE_PERIOD_HOURS = 48;

  /**
   * Initiates the handover process for a user
   */
  async initiateHandover(userId: string): Promise<HandoverProcess> {
    try {
      // Check if there's already an active handover process
      const existingHandover = await this.getActiveHandover(userId);
      if (existingHandover) {
        console.log(`Handover already active for user ${userId}`);
        return existingHandover;
      }

      const now = new Date();
      const gracePeriodEnds = new Date(
        now.getTime() +
          HandoverOrchestrator.GRACE_PERIOD_HOURS * 60 * 60 * 1000,
      );

      // Create new handover process
      const query = `
        INSERT INTO handover_processes (
          user_id, status, initiated_at, grace_period_ends, 
          metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const metadata = {
        gracePeriodHours: HandoverOrchestrator.GRACE_PERIOD_HOURS,
        initiatedBy: "inactivity_monitor",
        reason: "inactivity_threshold_exceeded",
      };

      const result = await DatabaseConnection.query(query, [
        userId,
        HandoverProcessStatus.GRACE_PERIOD,
        now,
        gracePeriodEnds,
        JSON.stringify(metadata),
        now,
        now,
      ]);

      const handoverProcess = this.mapRowToHandoverProcess(result.rows[0]);

      console.log(
        `Handover process initiated for user ${userId}, grace period ends: ${gracePeriodEnds.toISOString()}`,
      );

      // TODO: Send initial grace period notifications
      // TODO: Schedule grace period monitoring

      return handoverProcess;
    } catch (error) {
      console.error(`Failed to initiate handover for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Cancels an active handover process
   */
  async cancelHandover(userId: string, reason: string): Promise<void> {
    try {
      const now = new Date();

      const query = `
        UPDATE handover_processes 
        SET status = $1, cancelled_at = $2, cancellation_reason = $3, updated_at = $4
        WHERE user_id = $5 AND status NOT IN ('completed', 'cancelled')
      `;

      const result = await DatabaseConnection.query(query, [
        HandoverProcessStatus.CANCELLED,
        now,
        reason,
        now,
        userId,
      ]);

      if (result.rowCount === 0) {
        console.log(`No active handover process found for user ${userId}`);
        return;
      }

      console.log(`Handover process cancelled for user ${userId}: ${reason}`);

      // TODO: Send cancellation notifications to successors if they were already notified
    } catch (error) {
      console.error(`Failed to cancel handover for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Processes a successor's response to handover notification
   */
  async processSuccessorResponse(
    handoverId: string,
    successorId: string,
    _response: unknown,
  ): Promise<void> {
    try {
      // TODO: Implement successor response processing
      // This will handle successor verification and consent
      console.log(
        `Processing successor response for handover ${handoverId}, successor ${successorId}`,
      );

      // Placeholder implementation
      const query = `
        UPDATE successor_notifications 
        SET verification_status = 'verified', verified_at = NOW()
        WHERE handover_process_id = $1 AND successor_id = $2
      `;

      await DatabaseConnection.query(query, [handoverId, successorId]);
    } catch (error) {
      console.error(
        `Failed to process successor response for handover ${handoverId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Gets the current handover status for a user
   */
  async getHandoverStatus(userId: string): Promise<HandoverProcess | null> {
    try {
      return await this.getActiveHandover(userId);
    } catch (error) {
      console.error(`Failed to get handover status for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Processes grace period expiration
   */
  async processGracePeriodExpiration(handoverId: string): Promise<void> {
    try {
      // Update handover status to awaiting successors
      const query = `
        UPDATE handover_processes 
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND status = $3
      `;

      const result = await DatabaseConnection.query(query, [
        HandoverProcessStatus.AWAITING_SUCCESSORS,
        handoverId,
        HandoverProcessStatus.GRACE_PERIOD,
      ]);

      if (result.rowCount === 0) {
        console.log(
          `Handover ${handoverId} is not in grace period or doesn't exist`,
        );
        return;
      }

      console.log(
        `Grace period expired for handover ${handoverId}, notifying successors`,
      );

      // TODO: Notify successors
      // TODO: Begin successor verification process
    } catch (error) {
      console.error(
        `Failed to process grace period expiration for handover ${handoverId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Gets all handover processes that need attention
   */
  async getHandoversNeedingAttention(): Promise<HandoverProcess[]> {
    try {
      const query = `
        SELECT * FROM handover_processes 
        WHERE status IN ('grace_period', 'awaiting_successors', 'verification_pending')
          AND (
            (status = 'grace_period' AND grace_period_ends <= NOW()) OR
            (status != 'grace_period')
          )
        ORDER BY created_at ASC
      `;

      const result = await DatabaseConnection.query(query);
      return result.rows.map((row: unknown) =>
        this.mapRowToHandoverProcess(row),
      );
    } catch (error) {
      console.error("Failed to get handovers needing attention:", error);
      return [];
    }
  }

  /**
   * Private helper methods
   */
  private async getActiveHandover(
    userId: string,
  ): Promise<HandoverProcess | null> {
    const query = `
      SELECT * FROM handover_processes 
      WHERE user_id = $1 AND status NOT IN ('completed', 'cancelled')
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    const result = await DatabaseConnection.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToHandoverProcess(result.rows[0]);
  }

  private mapRowToHandoverProcess(row: unknown): HandoverProcess {
    const dbRow = row as {
      id: string;
      user_id: string;
      status: string;
      initiated_at: Date;
      grace_period_ends: Date;
      completed_at?: Date;
      cancelled_at?: Date;
      cancellation_reason?: string;
      metadata: string;
      created_at: Date;
      updated_at: Date;
    };

    return {
      id: dbRow.id,
      userId: dbRow.user_id,
      status: dbRow.status as HandoverProcessStatus,
      initiatedAt: dbRow.initiated_at,
      gracePeriodEnds: dbRow.grace_period_ends,
      completedAt: dbRow.completed_at,
      cancelledAt: dbRow.cancelled_at,
      cancellationReason: dbRow.cancellation_reason,
      metadata: dbRow.metadata ? JSON.parse(dbRow.metadata) : {},
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
    };
  }
}
