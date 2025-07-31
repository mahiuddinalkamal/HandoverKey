import { NotificationService } from "../../services/notification-service";
import { DatabaseConnection } from "@handoverkey/database";
import {
  ReminderType,
  NotificationMethod,
  DeliveryStatus,
} from "@handoverkey/shared/src/types/dead-mans-switch";

// Mock the database connection
jest.mock("@handoverkey/database");
const mockDatabaseConnection = DatabaseConnection as jest.Mocked<
  typeof DatabaseConnection
>;

describe("NotificationService", () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
    jest.clearAllMocks();
  });

  describe("sendReminder", () => {
    it("should send first reminder notification", async () => {
      const mockUser = {
        id: "user-123",
        email: "user@example.com",
      };

      const mockSettings = {
        notification_methods: ["email"],
      };

      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [mockSettings] }) // getUserNotificationSettings
        .mockResolvedValueOnce({ rows: [mockUser] }) // getUserById
        .mockResolvedValueOnce({ rows: [] }) // store check-in token
        .mockResolvedValueOnce({ rows: [] }); // recordNotificationDelivery

      const result = await notificationService.sendReminder(
        "user-123",
        ReminderType.FIRST_REMINDER,
      );

      expect(result.userId).toBe("user-123");
      expect(result.method).toBe(NotificationMethod.EMAIL);
      expect(result.status).toBe(DeliveryStatus.SENT);
    });

    it("should send second reminder notification", async () => {
      const mockUser = {
        id: "user-123",
        email: "user@example.com",
      };

      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ notification_methods: ["email"] }] })
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await notificationService.sendReminder(
        "user-123",
        ReminderType.SECOND_REMINDER,
      );

      expect(result.userId).toBe("user-123");
      expect(result.method).toBe(NotificationMethod.EMAIL);
      expect(result.status).toBe(DeliveryStatus.SENT);
    });

    it("should send final warning notification", async () => {
      const mockUser = {
        id: "user-123",
        email: "user@example.com",
      };

      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ notification_methods: ["email"] }] })
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await notificationService.sendReminder(
        "user-123",
        ReminderType.FINAL_WARNING,
      );

      expect(result.userId).toBe("user-123");
      expect(result.method).toBe(NotificationMethod.EMAIL);
      expect(result.status).toBe(DeliveryStatus.SENT);
    });

    it("should handle user not found", async () => {
      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ notification_methods: ["email"] }] })
        .mockResolvedValueOnce({ rows: [] }) // user not found
        .mockResolvedValueOnce({ rows: [] }); // recordNotificationDelivery

      const result = await notificationService.sendReminder(
        "user-123",
        ReminderType.FIRST_REMINDER,
      );

      expect(result.status).toBe(DeliveryStatus.FAILED);
      expect(result.errorMessage).toBe("User not found");
    });

    it("should record notification delivery", async () => {
      const mockUser = {
        id: "user-123",
        email: "user@example.com",
      };

      const mockQuery = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ notification_methods: ["email"] }] })
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      mockDatabaseConnection.query = mockQuery;

      await notificationService.sendReminder(
        "user-123",
        ReminderType.FIRST_REMINDER,
      );

      // Check that notification delivery was recorded
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO notification_deliveries"),
        [
          "user-123",
          ReminderType.FIRST_REMINDER,
          NotificationMethod.EMAIL,
          "user@example.com",
          DeliveryStatus.SENT,
          undefined, // no error message
        ],
      );
    });
  });

  describe("sendHandoverAlert", () => {
    it("should send alerts to all successors", async () => {
      const mockSuccessors = [
        { id: "successor-1", name: "John Doe", email: "john@example.com" },
        { id: "successor-2", name: "Jane Smith", email: "jane@example.com" },
      ];

      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [mockSuccessors[0]] }) // getSuccessorById
        .mockResolvedValueOnce({ rows: [] }) // recordNotificationDelivery
        .mockResolvedValueOnce({ rows: [mockSuccessors[1]] }) // getSuccessorById
        .mockResolvedValueOnce({ rows: [] }); // recordNotificationDelivery

      const results = await notificationService.sendHandoverAlert("user-123", [
        "successor-1",
        "successor-2",
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].userId).toBe("user-123");
      expect(results[0].status).toBe(DeliveryStatus.SENT);
      expect(results[1].userId).toBe("user-123");
      expect(results[1].status).toBe(DeliveryStatus.SENT);
    });

    it("should handle successor not found", async () => {
      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [] }); // successor not found

      const results = await notificationService.sendHandoverAlert("user-123", [
        "nonexistent-successor",
      ]);

      expect(results).toHaveLength(0); // No results when successor not found
    });
  });

  describe("generateCheckInLink", () => {
    it("should generate secure check-in link", async () => {
      const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
      mockDatabaseConnection.query = mockQuery;

      const link = await notificationService.generateCheckInLink(
        "user-123",
        7 * 24 * 60 * 60 * 1000, // 7 days
      );

      expect(link).toMatch(/^http:\/\/localhost:3000\/checkin\?token=.+$/);

      // Check that token was stored in database
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO checkin_tokens"),
        expect.arrayContaining([
          "user-123",
          expect.any(String), // token hash
          expect.any(Date), // expires at
        ]),
      );
    });
  });

  describe("validateCheckInLink", () => {
    it("should validate valid check-in token", async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const mockTokenData = {
        user_id: "user-123",
        expires_at: futureDate,
        used_at: null,
      };

      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValue({ rows: [mockTokenData] });

      const result =
        await notificationService.validateCheckInLink("valid-token");

      expect(result.isValid).toBe(true);
      expect(result.userId).toBe("user-123");
      expect(result.remainingTime).toBeGreaterThan(0);
    });

    it("should reject expired token", async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const mockTokenData = {
        user_id: "user-123",
        expires_at: pastDate,
        used_at: null,
      };

      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValue({ rows: [mockTokenData] });

      const result =
        await notificationService.validateCheckInLink("expired-token");

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Check-in token has expired");
    });

    it("should reject already used token", async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      const usedDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const mockTokenData = {
        user_id: "user-123",
        expires_at: futureDate,
        used_at: usedDate,
      };

      mockDatabaseConnection.query = jest
        .fn()
        .mockResolvedValue({ rows: [mockTokenData] });

      const result =
        await notificationService.validateCheckInLink("used-token");

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Check-in token has already been used");
    });

    it("should reject invalid token", async () => {
      mockDatabaseConnection.query = jest.fn().mockResolvedValue({ rows: [] }); // token not found

      const result =
        await notificationService.validateCheckInLink("invalid-token");

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid check-in token");
    });
  });

  describe("markCheckInTokenUsed", () => {
    it("should mark token as used", async () => {
      const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
      mockDatabaseConnection.query = mockQuery;

      await notificationService.markCheckInTokenUsed(
        "test-token",
        "192.168.1.1",
        "Mozilla/5.0",
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE checkin_tokens"),
        [
          expect.any(String), // token hash
          "192.168.1.1",
          "Mozilla/5.0",
        ],
      );
    });
  });
});
