import { HandoverOrchestrator } from "../../services/handover-orchestrator";
import { DatabaseConnection } from "@handoverkey/database";
import { HandoverProcessStatus } from "@handoverkey/shared/src/types/dead-mans-switch";

// Mock the database connection
jest.mock("@handoverkey/database");
const mockDatabaseConnection = DatabaseConnection as jest.Mocked<
  typeof DatabaseConnection
>;

describe("HandoverOrchestrator", () => {
  let handoverOrchestrator: HandoverOrchestrator;

  beforeEach(() => {
    handoverOrchestrator = new HandoverOrchestrator();
    jest.clearAllMocks();
  });

  describe("initiateHandover", () => {
    it("should create new handover process", async () => {
      // Mock no existing handover
      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [] }) // getActiveHandover - no existing
        .mockResolvedValueOnce({
          rows: [
            {
              id: "handover-123",
              user_id: "user-123",
              status: HandoverProcessStatus.GRACE_PERIOD,
              initiated_at: new Date(),
              grace_period_ends: new Date(Date.now() + 48 * 60 * 60 * 1000),
              metadata: JSON.stringify({
                gracePeriodHours: 48,
                initiatedBy: "inactivity_monitor",
                reason: "inactivity_threshold_exceeded",
              }),
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        }); // INSERT handover process

      const result = await handoverOrchestrator.initiateHandover("user-123");

      expect(result.id).toBe("handover-123");
      expect(result.userId).toBe("user-123");
      expect(result.status).toBe(HandoverProcessStatus.GRACE_PERIOD);
      expect(result.gracePeriodEnds).toBeInstanceOf(Date);

      // Check that handover was inserted
      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO handover_processes"),
        [
          "user-123",
          HandoverProcessStatus.GRACE_PERIOD,
          expect.any(Date), // initiated_at
          expect.any(Date), // grace_period_ends
          expect.any(String), // metadata JSON
          expect.any(Date), // created_at
          expect.any(Date), // updated_at
        ],
      );
    });

    it("should return existing handover if already active", async () => {
      const existingHandover = {
        id: "existing-handover",
        user_id: "user-123",
        status: HandoverProcessStatus.GRACE_PERIOD,
        initiated_at: new Date(),
        grace_period_ends: new Date(),
        metadata: "{}",
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValue({ rows: [existingHandover] }); // getActiveHandover

      const result = await handoverOrchestrator.initiateHandover("user-123");

      expect(result.id).toBe("existing-handover");
      expect(result.userId).toBe("user-123");

      // Should not create new handover
      expect(mockDatabaseConnection.query).toHaveBeenCalledTimes(1);
    });

    it("should handle database errors gracefully", async () => {
      mockDatabaseConnection.query = jest
        .fn()
        .mockRejectedValue(new Error("Database error"));

      await expect(
        handoverOrchestrator.initiateHandover("user-123"),
      ).rejects.toThrow("Database error");
    });
  });

  describe("cancelHandover", () => {
    it("should cancel active handover process", async () => {
      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValue({ rowCount: 1 }); // UPDATE successful

      await handoverOrchestrator.cancelHandover(
        "user-123",
        "User became active",
      );

      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE handover_processes"),
        [
          HandoverProcessStatus.CANCELLED,
          expect.any(Date), // cancelled_at
          "User became active",
          expect.any(Date), // updated_at
          "user-123",
        ],
      );
    });

    it("should handle no active handover to cancel", async () => {
      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValue({ rowCount: 0 }); // No rows updated

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await handoverOrchestrator.cancelHandover(
        "user-123",
        "User became active",
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "No active handover process found for user user-123",
      );

      consoleSpy.mockRestore();
    });
  });

  describe("getHandoverStatus", () => {
    it("should return active handover status", async () => {
      const mockHandover = {
        id: "handover-123",
        user_id: "user-123",
        status: HandoverProcessStatus.GRACE_PERIOD,
        initiated_at: new Date(),
        grace_period_ends: new Date(),
        metadata: JSON.stringify({ test: "data" }),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValue({ rows: [mockHandover] });

      const result = await handoverOrchestrator.getHandoverStatus("user-123");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("handover-123");
      expect(result!.userId).toBe("user-123");
      expect(result!.status).toBe(HandoverProcessStatus.GRACE_PERIOD);
      expect(result!.metadata).toEqual({ test: "data" });
    });

    it("should return null when no active handover", async () => {
      mockDatabaseConnection.query = jest.fn().mockResolvedValue({ rows: [] });

      const result = await handoverOrchestrator.getHandoverStatus("user-123");

      expect(result).toBeNull();
    });

    it("should handle database errors", async () => {
      mockDatabaseConnection.query = jest
        .fn()
        .mockRejectedValue(new Error("Database error"));

      const result = await handoverOrchestrator.getHandoverStatus("user-123");

      expect(result).toBeNull();
    });
  });

  describe("processSuccessorResponse", () => {
    it("should update successor verification status", async () => {
      mockDatabaseConnection.query = jest.fn().mockResolvedValue({ rows: [] });

      await handoverOrchestrator.processSuccessorResponse(
        "handover-123",
        "successor-456",
        { verified: true },
      );

      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE successor_notifications"),
        ["handover-123", "successor-456"],
      );
    });
  });

  describe("processGracePeriodExpiration", () => {
    it("should update handover status to awaiting successors", async () => {
      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValue({ rowCount: 1 });

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await handoverOrchestrator.processGracePeriodExpiration("handover-123");

      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE handover_processes"),
        [
          HandoverProcessStatus.AWAITING_SUCCESSORS,
          "handover-123",
          HandoverProcessStatus.GRACE_PERIOD,
        ],
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Grace period expired for handover handover-123, notifying successors",
      );

      consoleSpy.mockRestore();
    });

    it("should handle handover not in grace period", async () => {
      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValue({ rowCount: 0 });

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await handoverOrchestrator.processGracePeriodExpiration("handover-123");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Handover handover-123 is not in grace period or doesn't exist",
      );

      consoleSpy.mockRestore();
    });
  });

  describe("getHandoversNeedingAttention", () => {
    it("should return handovers that need processing", async () => {
      const mockHandovers = [
        {
          id: "handover-1",
          user_id: "user-1",
          status: HandoverProcessStatus.GRACE_PERIOD,
          initiated_at: new Date(),
          grace_period_ends: new Date(Date.now() - 1000), // Expired
          metadata: "{}",
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: "handover-2",
          user_id: "user-2",
          status: HandoverProcessStatus.AWAITING_SUCCESSORS,
          initiated_at: new Date(),
          grace_period_ends: new Date(),
          metadata: "{}",
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValue({ rows: mockHandovers });

      const result = await handoverOrchestrator.getHandoversNeedingAttention();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("handover-1");
      expect(result[1].id).toBe("handover-2");
    });

    it("should return empty array when no handovers need attention", async () => {
      mockDatabaseConnection.query = jest.fn().mockResolvedValue({ rows: [] });

      const result = await handoverOrchestrator.getHandoversNeedingAttention();

      expect(result).toHaveLength(0);
    });

    it("should handle database errors", async () => {
      mockDatabaseConnection.query = jest
        .fn()
        .mockRejectedValue(new Error("Database error"));

      const result = await handoverOrchestrator.getHandoversNeedingAttention();

      expect(result).toHaveLength(0);
    });
  });
});
