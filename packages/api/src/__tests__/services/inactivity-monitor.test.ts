import { InactivityMonitorService } from "../../services/inactivity-monitor";
import { ActivityService } from "../../services/activity-service";
import { NotificationService } from "../../services/notification-service";
import { HandoverOrchestrator } from "../../services/handover-orchestrator";
import { DatabaseConnection } from "@handoverkey/database";
import {
  HandoverStatus,
  ReminderType,
  SystemStatusType,
} from "@handoverkey/shared/src/types/dead-mans-switch";

// Mock all dependencies
jest.mock("../../services/activity-service");
jest.mock("../../services/notification-service");
jest.mock("../../services/handover-orchestrator");
jest.mock("@handoverkey/database");

const mockActivityService = ActivityService as jest.MockedClass<
  typeof ActivityService
>;
const mockNotificationService = NotificationService as jest.MockedClass<
  typeof NotificationService
>;
const mockHandoverOrchestrator = HandoverOrchestrator as jest.MockedClass<
  typeof HandoverOrchestrator
>;
const mockDatabaseConnection = DatabaseConnection as jest.Mocked<
  typeof DatabaseConnection
>;

describe("InactivityMonitorService", () => {
  let inactivityMonitor: InactivityMonitorService;
  let mockActivityServiceInstance: jest.Mocked<ActivityService>;
  let mockNotificationServiceInstance: jest.Mocked<NotificationService>;
  let mockHandoverOrchestratorInstance: jest.Mocked<HandoverOrchestrator>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock instances
    mockActivityServiceInstance = {
      getUserActivityStatus: jest.fn(),
    } as any;

    mockNotificationServiceInstance = {
      sendReminder: jest.fn(),
    } as any;

    mockHandoverOrchestratorInstance = {
      initiateHandover: jest.fn(),
    } as any;

    mockActivityService.mockImplementation(() => mockActivityServiceInstance);
    mockNotificationService.mockImplementation(
      () => mockNotificationServiceInstance,
    );
    mockHandoverOrchestrator.mockImplementation(
      () => mockHandoverOrchestratorInstance,
    );

    inactivityMonitor = InactivityMonitorService.getInstance();

    // Mock the service instances on the inactivity monitor
    (inactivityMonitor as any).activityService = mockActivityServiceInstance;
    (inactivityMonitor as any).notificationService =
      mockNotificationServiceInstance;
    (inactivityMonitor as any).handoverOrchestrator =
      mockHandoverOrchestratorInstance;
  });

  describe("checkUserInactivity", () => {
    beforeEach(() => {
      // Mock system not in maintenance and user tracking not paused
      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ status: "operational" }] }) // system status
        .mockResolvedValueOnce({ rows: [{ is_paused: false }] }) // user tracking status
        .mockResolvedValueOnce({ rows: [{ threshold_days: 90 }] }); // inactivity settings
    });

    it("should skip check if system is in maintenance", async () => {
      mockDatabaseConnection.query = jest.fn().mockResolvedValueOnce({
        rows: [{ status: SystemStatusType.MAINTENANCE }],
      });

      await inactivityMonitor.checkUserInactivity("user-123");

      expect(
        mockActivityServiceInstance.getUserActivityStatus,
      ).not.toHaveBeenCalled();
    });

    it("should skip check if user tracking is paused", async () => {
      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ status: "operational" }] })
        .mockResolvedValueOnce({ rows: [{ is_paused: true }] });

      await inactivityMonitor.checkUserInactivity("user-123");

      expect(
        mockActivityServiceInstance.getUserActivityStatus,
      ).not.toHaveBeenCalled();
    });

    it("should initiate handover when threshold >= 100%", async () => {
      const mockActivityStatus = {
        lastActivity: new Date(),
        thresholdPercentage: 100,
        handoverStatus: HandoverStatus.NORMAL,
        inactivityDuration: 1000,
        timeRemaining: 0,
        nextReminderDue: null,
      };

      // Reset the database mock for this specific test
      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ status: "operational" }] }) // system status
        .mockResolvedValueOnce({ rows: [{ is_paused: false }] }) // user tracking status
        .mockResolvedValueOnce({ rows: [{ threshold_days: 90 }] }) // inactivity settings
        .mockResolvedValue({ rows: [] }); // getSystemDowntimeSince

      mockActivityServiceInstance.getUserActivityStatus.mockResolvedValue(
        mockActivityStatus,
      );

      await inactivityMonitor.checkUserInactivity("user-123");

      expect(
        mockHandoverOrchestratorInstance.initiateHandover,
      ).toHaveBeenCalledWith("user-123");
    });

    it("should send final warning at 95% threshold", async () => {
      const mockActivityStatus = {
        lastActivity: new Date(),
        thresholdPercentage: 95,
        handoverStatus: HandoverStatus.REMINDER_PHASE,
        inactivityDuration: 1000,
        timeRemaining: 1000,
        nextReminderDue: null,
      };

      // Reset the database mock for this specific test
      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ status: "operational" }] }) // system status
        .mockResolvedValueOnce({ rows: [{ is_paused: false }] }) // user tracking status
        .mockResolvedValueOnce({ rows: [{ threshold_days: 90 }] }) // inactivity settings
        .mockResolvedValueOnce({ rows: [] }) // getSystemDowntimeSince
        .mockResolvedValueOnce({ rows: [{ last_sent: null }] }); // no recent reminder

      mockActivityServiceInstance.getUserActivityStatus.mockResolvedValue(
        mockActivityStatus,
      );

      mockNotificationServiceInstance.sendReminder.mockResolvedValue({
        id: "notification-123",
        userId: "user-123",
        method: "email" as any,
        status: "sent" as any,
        timestamp: new Date(),
        retryCount: 0,
      });

      await inactivityMonitor.checkUserInactivity("user-123");

      expect(mockNotificationServiceInstance.sendReminder).toHaveBeenCalledWith(
        "user-123",
        ReminderType.FINAL_WARNING,
      );
    });

    it("should send second reminder at 85% threshold", async () => {
      const mockActivityStatus = {
        lastActivity: new Date(),
        thresholdPercentage: 85,
        handoverStatus: HandoverStatus.REMINDER_PHASE,
        inactivityDuration: 1000,
        timeRemaining: 1000,
        nextReminderDue: null,
      };

      // Reset the database mock for this specific test
      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ status: "operational" }] }) // system status
        .mockResolvedValueOnce({ rows: [{ is_paused: false }] }) // user tracking status
        .mockResolvedValueOnce({ rows: [{ threshold_days: 90 }] }) // inactivity settings
        .mockResolvedValueOnce({ rows: [] }) // getSystemDowntimeSince
        .mockResolvedValueOnce({ rows: [{ last_sent: null }] }); // no recent reminder

      mockActivityServiceInstance.getUserActivityStatus.mockResolvedValue(
        mockActivityStatus,
      );

      mockNotificationServiceInstance.sendReminder.mockResolvedValue({
        id: "notification-123",
        userId: "user-123",
        method: "email" as any,
        status: "sent" as any,
        timestamp: new Date(),
        retryCount: 0,
      });

      await inactivityMonitor.checkUserInactivity("user-123");

      expect(mockNotificationServiceInstance.sendReminder).toHaveBeenCalledWith(
        "user-123",
        ReminderType.SECOND_REMINDER,
      );
    });

    it("should send first reminder at 75% threshold", async () => {
      const mockActivityStatus = {
        lastActivity: new Date(),
        thresholdPercentage: 75,
        handoverStatus: HandoverStatus.REMINDER_PHASE,
        inactivityDuration: 1000,
        timeRemaining: 1000,
        nextReminderDue: null,
      };

      // Reset the database mock for this specific test
      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ status: "operational" }] }) // system status
        .mockResolvedValueOnce({ rows: [{ is_paused: false }] }) // user tracking status
        .mockResolvedValueOnce({ rows: [{ threshold_days: 90 }] }) // inactivity settings
        .mockResolvedValueOnce({ rows: [] }) // getSystemDowntimeSince
        .mockResolvedValueOnce({ rows: [{ last_sent: null }] }); // no recent reminder

      mockActivityServiceInstance.getUserActivityStatus.mockResolvedValue(
        mockActivityStatus,
      );

      mockNotificationServiceInstance.sendReminder.mockResolvedValue({
        id: "notification-123",
        userId: "user-123",
        method: "email" as any,
        status: "sent" as any,
        timestamp: new Date(),
        retryCount: 0,
      });

      await inactivityMonitor.checkUserInactivity("user-123");

      expect(mockNotificationServiceInstance.sendReminder).toHaveBeenCalledWith(
        "user-123",
        ReminderType.FIRST_REMINDER,
      );
    });

    it("should not send reminder if recently sent", async () => {
      const mockActivityStatus = {
        lastActivity: new Date(),
        thresholdPercentage: 75,
        handoverStatus: HandoverStatus.REMINDER_PHASE,
        inactivityDuration: 1000,
        timeRemaining: 1000,
        nextReminderDue: null,
      };

      mockActivityServiceInstance.getUserActivityStatus.mockResolvedValue(
        mockActivityStatus,
      );

      // Mock recent reminder sent (1 hour ago, but cooldown is 24 hours)
      const recentTime = new Date(Date.now() - 60 * 60 * 1000);
      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ status: "operational" }] })
        .mockResolvedValueOnce({ rows: [{ is_paused: false }] })
        .mockResolvedValueOnce({ rows: [{ threshold_days: 90 }] })
        .mockResolvedValueOnce({ rows: [{ last_sent: recentTime }] });

      await inactivityMonitor.checkUserInactivity("user-123");

      expect(
        mockNotificationServiceInstance.sendReminder,
      ).not.toHaveBeenCalled();
    });

    it("should not initiate handover if already in grace period", async () => {
      const mockActivityStatus = {
        lastActivity: new Date(),
        thresholdPercentage: 100,
        handoverStatus: HandoverStatus.GRACE_PERIOD,
        inactivityDuration: 1000,
        timeRemaining: 0,
        nextReminderDue: null,
      };

      mockActivityServiceInstance.getUserActivityStatus.mockResolvedValue(
        mockActivityStatus,
      );

      await inactivityMonitor.checkUserInactivity("user-123");

      expect(
        mockHandoverOrchestratorInstance.initiateHandover,
      ).not.toHaveBeenCalled();
    });
  });

  describe("checkAllUsers", () => {
    it("should process all active users in batches", async () => {
      const mockUsers = [{ id: "user-1" }, { id: "user-2" }, { id: "user-3" }];

      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValue({ rows: mockUsers });

      // Mock checkUserInactivity to resolve quickly
      const checkUserInactivitySpy = jest
        .spyOn(inactivityMonitor, "checkUserInactivity")
        .mockResolvedValue();

      await inactivityMonitor.checkAllUsers();

      expect(checkUserInactivitySpy).toHaveBeenCalledTimes(3);
      expect(checkUserInactivitySpy).toHaveBeenCalledWith("user-1");
      expect(checkUserInactivitySpy).toHaveBeenCalledWith("user-2");
      expect(checkUserInactivitySpy).toHaveBeenCalledWith("user-3");
    });

    it("should handle empty user list", async () => {
      mockDatabaseConnection.query = jest.fn().mockResolvedValue({ rows: [] });

      const checkUserInactivitySpy = jest
        .spyOn(inactivityMonitor, "checkUserInactivity")
        .mockResolvedValue();

      await inactivityMonitor.checkAllUsers();

      expect(checkUserInactivitySpy).not.toHaveBeenCalled();
    });
  });

  describe("pauseSystemTracking", () => {
    it("should update system status to maintenance", async () => {
      const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
      mockDatabaseConnection.query = mockQuery;

      await inactivityMonitor.pauseSystemTracking("Scheduled maintenance");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO system_status"),
        [
          SystemStatusType.MAINTENANCE,
          expect.any(Date),
          "Scheduled maintenance",
          expect.any(Date),
        ],
      );
    });
  });

  describe("resumeSystemTracking", () => {
    it("should update system status to operational", async () => {
      const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
      mockDatabaseConnection.query = mockQuery;

      await inactivityMonitor.resumeSystemTracking();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE system_status"),
        [expect.any(Date)],
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO system_status"),
        [SystemStatusType.OPERATIONAL, "System resumed", expect.any(Date)],
      );
    });
  });

  describe("start and stop", () => {
    afterEach(() => {
      // Ensure the monitor is stopped after each test to clean up intervals
      if (inactivityMonitor.isHealthy()) {
        inactivityMonitor.stop();
      }
    });

    it("should start monitoring service", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      inactivityMonitor.start();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Starting InactivityMonitor service...",
      );
      expect(inactivityMonitor.isHealthy()).toBe(true);

      consoleSpy.mockRestore();
    });

    it("should stop monitoring service", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      inactivityMonitor.start();
      inactivityMonitor.stop();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Stopping InactivityMonitor service...",
      );
      expect(inactivityMonitor.isHealthy()).toBe(false);

      consoleSpy.mockRestore();
    });

    it("should not start if already running", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      inactivityMonitor.start();
      inactivityMonitor.start(); // Second call

      expect(consoleSpy).toHaveBeenCalledWith(
        "InactivityMonitor is already running",
      );

      consoleSpy.mockRestore();
    });
  });

  describe("getStats", () => {
    afterEach(() => {
      // Clean up if the service was started for this test
      if (inactivityMonitor.isHealthy()) {
        inactivityMonitor.stop();
      }
    });

    it("should return monitoring statistics", async () => {
      const mockUsers = [{ id: "user-1" }, { id: "user-2" }];
      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: mockUsers }) // getActiveUsers in start()
        .mockResolvedValueOnce({ rows: mockUsers }) // getActiveUsers in getStats()
        .mockResolvedValueOnce({ rows: [{ status: "operational" }] }); // getCurrentSystemStatus in getStats()

      // Start the service for this test
      inactivityMonitor.start();

      // Wait a bit for the initial check to complete
      await new Promise((resolve) => global.setTimeout(resolve, 10));

      const stats = await inactivityMonitor.getStats();

      expect(stats).toEqual({
        isRunning: true,
        checkInterval: 15 * 60 * 1000, // 15 minutes
        activeUsers: 2,
        systemStatus: "operational",
      });
    });
  });
});
