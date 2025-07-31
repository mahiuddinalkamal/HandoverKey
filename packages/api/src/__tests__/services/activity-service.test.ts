import { ActivityService } from "../../services/activity-service";
import { DatabaseConnection } from "@handoverkey/database";
import {
  ActivityType,
  ClientType,
  HandoverStatus,
} from "@handoverkey/shared/src/types/dead-mans-switch";

// Mock the database connection
jest.mock("@handoverkey/database");
const mockDatabaseConnection = DatabaseConnection as jest.Mocked<
  typeof DatabaseConnection
>;

describe("ActivityService", () => {
  let activityService: ActivityService;

  beforeEach(() => {
    activityService = new ActivityService();
    jest.clearAllMocks();
  });

  describe("recordActivity", () => {
    it("should record activity with cryptographic signature", async () => {
      const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
      mockDatabaseConnection.query = mockQuery;

      await activityService.recordActivity(
        "user-123",
        ActivityType.LOGIN,
        { test: "data" },
        ClientType.WEB,
        "192.168.1.1",
        "Mozilla/5.0",
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO activity_records"),
        expect.arrayContaining([
          "user-123",
          ActivityType.LOGIN,
          ClientType.WEB,
          "192.168.1.1",
          "Mozilla/5.0",
          expect.any(String), // JSON metadata
          expect.any(String), // signature
          expect.any(Date), // timestamp
        ]),
      );
    });

    it("should update user last_login for LOGIN activity", async () => {
      const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
      mockDatabaseConnection.query = mockQuery;

      await activityService.recordActivity("user-123", ActivityType.LOGIN);

      expect(mockQuery).toHaveBeenCalledWith(
        "UPDATE users SET last_login = NOW() WHERE id = $1",
        ["user-123"],
      );
    });

    it("should not update last_login for non-LOGIN activity", async () => {
      const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
      mockDatabaseConnection.query = mockQuery;

      await activityService.recordActivity(
        "user-123",
        ActivityType.VAULT_ACCESS,
      );

      expect(mockQuery).not.toHaveBeenCalledWith(
        "UPDATE users SET last_login = NOW() WHERE id = $1",
        ["user-123"],
      );
    });
  });

  describe("getLastActivity", () => {
    it("should return the most recent activity", async () => {
      const mockActivity = {
        id: "activity-123",
        user_id: "user-123",
        activity_type: ActivityType.LOGIN,
        client_type: ClientType.WEB,
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
        metadata: '{"test": "data"}',
        signature: "signature-hash",
        created_at: new Date("2023-01-01T12:00:00Z"),
      };

      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValue({ rows: [mockActivity] });

      const result = await activityService.getLastActivity("user-123");

      expect(result).toEqual({
        id: "activity-123",
        userId: "user-123",
        activityType: ActivityType.LOGIN,
        clientType: ClientType.WEB,
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        metadata: { test: "data" },
        signature: "signature-hash",
        createdAt: new Date("2023-01-01T12:00:00Z"),
      });
    });

    it("should return null when no activity found", async () => {
      mockDatabaseConnection.query = jest.fn().mockResolvedValue({ rows: [] });

      const result = await activityService.getLastActivity("user-123");

      expect(result).toBeNull();
    });
  });

  describe("getUserActivityStatus", () => {
    it("should calculate activity status with recent activity", async () => {
      const recentDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      const mockActivity = {
        id: "activity-123",
        user_id: "user-123",
        activity_type: ActivityType.LOGIN,
        client_type: ClientType.WEB,
        metadata: "{}",
        signature: "signature-hash",
        created_at: recentDate,
      };

      const mockInactivitySettings = {
        threshold_days: 90,
        is_paused: false,
      };

      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [mockActivity] }) // getLastActivity
        .mockResolvedValueOnce({ rows: [mockInactivitySettings] }) // getInactivitySettings
        .mockResolvedValueOnce({ rows: [] }); // getActiveHandover

      const result = await activityService.getUserActivityStatus("user-123");

      expect(result.lastActivity).toEqual(recentDate);
      expect(result.thresholdPercentage).toBeLessThan(1); // Very recent activity
      expect(result.handoverStatus).toBe(HandoverStatus.NORMAL);
      expect(result.timeRemaining).toBeGreaterThan(0);
    });

    it("should handle user with no activity using account creation date", async () => {
      const creationDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
      const mockUser = {
        id: "user-123",
        created_at: creationDate,
      };

      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [] }) // getLastActivity - no activity
        .mockResolvedValueOnce({
          rows: [{ threshold_days: 90, is_paused: false }],
        }) // getInactivitySettings
        .mockResolvedValueOnce({ rows: [] }) // getActiveHandover
        .mockResolvedValueOnce({ rows: [mockUser] }); // getUserById

      const result = await activityService.getUserActivityStatus("user-123");

      expect(result.lastActivity).toEqual(creationDate);
      expect(result.thresholdPercentage).toBeGreaterThan(30); // 30 days out of 90
      expect(result.handoverStatus).toBe(HandoverStatus.NORMAL);
    });

    it("should return REMINDER_PHASE status when threshold > 75%", async () => {
      const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 70); // 70 days ago
      const mockActivity = {
        id: "activity-123",
        user_id: "user-123",
        activity_type: ActivityType.LOGIN,
        client_type: ClientType.WEB,
        metadata: "{}",
        signature: "signature-hash",
        created_at: oldDate,
      };

      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [mockActivity] })
        .mockResolvedValueOnce({
          rows: [{ threshold_days: 90, is_paused: false }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await activityService.getUserActivityStatus("user-123");

      expect(result.thresholdPercentage).toBeGreaterThan(75);
      expect(result.handoverStatus).toBe(HandoverStatus.REMINDER_PHASE);
    });
  });

  describe("pauseTracking", () => {
    it("should pause tracking for a user", async () => {
      const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
      mockDatabaseConnection.query = mockQuery;

      const until = new Date("2023-12-31T23:59:59Z");
      await activityService.pauseTracking("user-123", "vacation", until);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE inactivity_settings"),
        ["user-123", "vacation", until],
      );

      // Should also record the pause as an activity
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO activity_records"),
        expect.arrayContaining([
          "user-123",
          ActivityType.SETTINGS_CHANGE,
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.stringContaining("pause_tracking"),
          expect.any(String),
          expect.any(Date),
        ]),
      );
    });
  });

  describe("resumeTracking", () => {
    it("should resume tracking for a user", async () => {
      const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
      mockDatabaseConnection.query = mockQuery;

      await activityService.resumeTracking("user-123");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE inactivity_settings"),
        ["user-123"],
      );

      // Should also record the resume as an activity
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO activity_records"),
        expect.arrayContaining([
          "user-123",
          ActivityType.SETTINGS_CHANGE,
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.stringContaining("resume_tracking"),
          expect.any(String),
          expect.any(Date),
        ]),
      );
    });
  });

  describe("getActivityHistory", () => {
    it("should return paginated activity history", async () => {
      const mockActivities = [
        {
          id: "activity-1",
          user_id: "user-123",
          activity_type: ActivityType.LOGIN,
          client_type: ClientType.WEB,
          metadata: "{}",
          signature: "sig1",
          created_at: new Date("2023-01-02T12:00:00Z"),
        },
        {
          id: "activity-2",
          user_id: "user-123",
          activity_type: ActivityType.VAULT_ACCESS,
          client_type: ClientType.WEB,
          metadata: "{}",
          signature: "sig2",
          created_at: new Date("2023-01-01T12:00:00Z"),
        },
      ];

      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ count: "2" }] }) // count query
        .mockResolvedValueOnce({ rows: mockActivities }); // data query

      const result = await activityService.getActivityHistory(
        "user-123",
        10,
        0,
        new Date("2023-01-01"),
        new Date("2023-01-03"),
        [ActivityType.LOGIN, ActivityType.VAULT_ACCESS],
      );

      expect(result.total).toBe(2);
      expect(result.activities).toHaveLength(2);
      expect(result.activities[0].id).toBe("activity-1");
      expect(result.activities[1].id).toBe("activity-2");
    });

    it("should handle empty activity history", async () => {
      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ count: "0" }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await activityService.getActivityHistory("user-123");

      expect(result.total).toBe(0);
      expect(result.activities).toHaveLength(0);
    });
  });

  describe("verifyActivityIntegrity", () => {
    it("should verify valid activity signature", async () => {
      // Create a real activity record to get the correct signature
      const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
      mockDatabaseConnection.query = mockQuery;

      const testMetadata = { test: "data" };
      const testDate = new Date("2023-01-01T12:00:00.000Z");

      // Mock the Date constructor to return a consistent timestamp
      const originalDate = global.Date;
      global.Date = jest.fn(() => testDate) as any;
      global.Date.now = jest.fn(() => testDate.getTime());

      await activityService.recordActivity(
        "user-123",
        ActivityType.LOGIN,
        testMetadata,
        ClientType.WEB,
      );

      // Restore Date
      global.Date = originalDate;

      // Get the signature that was generated
      const insertCall = mockQuery.mock.calls.find((call) =>
        call[0].includes("INSERT INTO activity_records"),
      );
      const signature = insertCall[1][6]; // signature is the 7th parameter

      const activityRecord = {
        id: "activity-123",
        userId: "user-123",
        activityType: ActivityType.LOGIN,
        clientType: ClientType.WEB,
        createdAt: testDate,
        metadata: testMetadata,
        signature,
        ipAddress: undefined,
        userAgent: undefined,
      };

      const isValid =
        await activityService.verifyActivityIntegrity(activityRecord);

      expect(isValid).toBe(true);
    });

    it("should reject invalid activity signature", async () => {
      const activityRecord = {
        id: "activity-123",
        userId: "user-123",
        activityType: ActivityType.LOGIN,
        clientType: ClientType.WEB,
        createdAt: new Date("2023-01-01T12:00:00.000Z"),
        metadata: { test: "data" },
        signature: "invalid-signature",
        ipAddress: undefined,
        userAgent: undefined,
      };

      const isValid =
        await activityService.verifyActivityIntegrity(activityRecord);

      expect(isValid).toBe(false);
    });
  });
});
