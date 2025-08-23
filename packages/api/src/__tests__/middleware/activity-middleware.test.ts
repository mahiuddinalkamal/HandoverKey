import { Response, NextFunction } from "express";
import { ActivityMiddleware } from "../../middleware/activity-middleware";
import { ActivityService } from "../../services/activity-service";
import {
  ActivityType,
  ClientType,
  HandoverStatus,
} from "@handoverkey/shared/src/types/dead-mans-switch";
import { AuthenticatedRequest } from "../../middleware/auth";

// Mock the ActivityService
jest.mock("../../services/activity-service");
const mockActivityService = ActivityService as jest.MockedClass<
  typeof ActivityService
>;

describe("ActivityMiddleware", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockActivityServiceInstance: jest.Mocked<ActivityService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockActivityServiceInstance = {
      recordActivity: jest.fn().mockResolvedValue(undefined),
      getUserActivityStatus: jest.fn(),
      getActivityHistory: jest.fn(),
    } as any;

    mockActivityService.mockImplementation(() => mockActivityServiceInstance);

    // Mock the static activityService property
    Object.defineProperty(ActivityMiddleware, "activityService", {
      value: mockActivityServiceInstance,
      writable: true,
      configurable: true,
    });

    mockRequest = {
      user: {
        userId: "user-123",
        email: "user@example.com",
        sessionId: "session-123",
      },
      ip: "192.168.1.1",
      get: jest.fn().mockImplementation((header) => {
        if (header === "User-Agent") return "Mozilla/5.0";
        if (header === "X-Client-Type") return undefined;
        return undefined;
      }),
      path: "/api/v1/test",
      method: "GET",
      params: {},
      body: {},
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe("trackActivity", () => {
    it("should track activity for authenticated user", async () => {
      const middleware = ActivityMiddleware.trackActivity(ActivityType.LOGIN);

      await middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();

      // Wait for async activity recording
      await new Promise((resolve) => global.setTimeout(resolve, 10));

      expect(mockActivityServiceInstance.recordActivity).toHaveBeenCalledWith(
        "user-123",
        ActivityType.LOGIN,
        expect.objectContaining({
          endpoint: "/api/v1/test",
          method: "GET",
          timestamp: expect.any(String),
        }),
        ClientType.WEB,
        "192.168.1.1",
        "Mozilla/5.0",
      );
    });

    it("should skip tracking for unauthenticated user", async () => {
      mockRequest.user = undefined;

      const middleware = ActivityMiddleware.trackActivity(ActivityType.LOGIN);

      await middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockActivityServiceInstance.recordActivity).not.toHaveBeenCalled();
    });

    it("should skip tracking for health check endpoints", async () => {
      const healthRequest = { ...mockRequest, path: "/health" };

      const middleware = ActivityMiddleware.trackActivity(
        ActivityType.API_REQUEST,
      );

      await middleware(
        healthRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockActivityServiceInstance.recordActivity).not.toHaveBeenCalled();
    });

    it("should skip tracking for OPTIONS requests", async () => {
      const optionsRequest = { ...mockRequest, method: "OPTIONS" };

      const middleware = ActivityMiddleware.trackActivity(
        ActivityType.API_REQUEST,
      );

      await middleware(
        optionsRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockActivityServiceInstance.recordActivity).not.toHaveBeenCalled();
    });

    it("should continue on activity recording error", async () => {
      mockActivityServiceInstance.recordActivity.mockRejectedValue(
        new Error("Database error"),
      );

      const middleware = ActivityMiddleware.trackActivity(ActivityType.LOGIN);

      await middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();

      // Wait for async error handling
      await new Promise((resolve) => global.setTimeout(resolve, 10));

      // Test passes if middleware continues despite error
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("detectClientType", () => {
    it("should detect web client from User-Agent", async () => {
      (mockRequest.get as jest.Mock).mockImplementation((header) => {
        if (header === "User-Agent") return "Mozilla/5.0 Chrome/91.0";
        if (header === "X-Client-Type") return undefined;
        return undefined;
      });

      const middleware = ActivityMiddleware.trackActivity(
        ActivityType.API_REQUEST,
      );

      await middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );

      await new Promise((resolve) => global.setTimeout(resolve, 10));

      expect(mockActivityServiceInstance.recordActivity).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        ClientType.WEB,
        expect.any(String),
        expect.any(String),
      );
    });

    it("should detect CLI client from User-Agent", async () => {
      (mockRequest.get as jest.Mock).mockImplementation((header) => {
        if (header === "User-Agent") return "HandoverKey-CLI/1.0";
        if (header === "X-Client-Type") return undefined;
        return undefined;
      });

      const middleware = ActivityMiddleware.trackActivity(
        ActivityType.API_REQUEST,
      );

      await middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );

      await new Promise((resolve) => global.setTimeout(resolve, 10));

      expect(mockActivityServiceInstance.recordActivity).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        ClientType.CLI,
        expect.any(String),
        expect.any(String),
      );
    });

    it("should detect mobile client from User-Agent", async () => {
      (mockRequest.get as jest.Mock).mockImplementation((header) => {
        if (header === "User-Agent") return "HandoverKey-Mobile/1.0";
        if (header === "X-Client-Type") return undefined;
        return undefined;
      });

      const middleware = ActivityMiddleware.trackActivity(
        ActivityType.API_REQUEST,
      );

      await middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );

      await new Promise((resolve) => global.setTimeout(resolve, 10));

      expect(mockActivityServiceInstance.recordActivity).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        ClientType.MOBILE,
        expect.any(String),
        expect.any(String),
      );
    });

    it("should use X-Client-Type header when available", async () => {
      (mockRequest.get as jest.Mock).mockImplementation((header) => {
        if (header === "X-Client-Type") return "mobile";
        if (header === "User-Agent") return "Mozilla/5.0";
        return undefined;
      });

      const middleware = ActivityMiddleware.trackActivity(
        ActivityType.API_REQUEST,
      );

      await middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );

      await new Promise((resolve) => global.setTimeout(resolve, 10));

      expect(mockActivityServiceInstance.recordActivity).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        ClientType.MOBILE,
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe("handleManualCheckIn", () => {
    it("should record manual check-in and return status", async () => {
      const mockActivityStatus = {
        lastActivity: new Date(),
        timeRemaining: 1000000,
        thresholdPercentage: 50,
        handoverStatus: HandoverStatus.NORMAL,
        inactivityDuration: 1000,
        nextReminderDue: null,
      };

      mockActivityServiceInstance.getUserActivityStatus.mockResolvedValue(
        mockActivityStatus,
      );

      await ActivityMiddleware.handleManualCheckIn(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      expect(mockActivityServiceInstance.recordActivity).toHaveBeenCalledWith(
        "user-123",
        ActivityType.MANUAL_CHECKIN,
        expect.objectContaining({
          manual: true,
          timestamp: expect.any(String),
          source: "manual_checkin_endpoint",
        }),
        ClientType.WEB,
        "192.168.1.1",
        "Mozilla/5.0",
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Check-in recorded successfully",
        activityStatus: {
          lastActivity: mockActivityStatus.lastActivity,
          timeRemaining: mockActivityStatus.timeRemaining,
          thresholdPercentage: mockActivityStatus.thresholdPercentage,
          handoverStatus: mockActivityStatus.handoverStatus,
        },
      });
    });

    it("should return 401 for unauthenticated user", async () => {
      mockRequest.user = undefined;

      await ActivityMiddleware.handleManualCheckIn(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Not authenticated",
      });
    });

    it("should handle errors gracefully", async () => {
      mockActivityServiceInstance.recordActivity.mockRejectedValue(
        new Error("Database error"),
      );

      await ActivityMiddleware.handleManualCheckIn(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Failed to record check-in",
      });

      // Test passes if error is handled gracefully
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getActivityStatus", () => {
    it("should return user activity status", async () => {
      const mockActivityStatus = {
        lastActivity: new Date(),
        inactivityDuration: 1000,
        thresholdPercentage: 50,
        nextReminderDue: null,
        handoverStatus: HandoverStatus.NORMAL,
        timeRemaining: 1000000,
      };

      mockActivityServiceInstance.getUserActivityStatus.mockResolvedValue(
        mockActivityStatus,
      );

      await ActivityMiddleware.getActivityStatus(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        activityStatus: mockActivityStatus,
      });
    });

    it("should return 401 for unauthenticated user", async () => {
      mockRequest.user = undefined;

      await ActivityMiddleware.getActivityStatus(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Not authenticated",
      });
    });
  });

  describe("getActivityHistory", () => {
    it("should return paginated activity history", async () => {
      const mockHistory = {
        activities: [
          {
            id: "activity-1",
            userId: "user-123",
            activityType: ActivityType.LOGIN,
            createdAt: new Date(),
          },
        ],
        total: 1,
      };

      mockActivityServiceInstance.getActivityHistory = jest
        .fn()
        .mockResolvedValue(mockHistory);

      mockRequest.query = {
        limit: "10",
        offset: "0",
        startDate: "2023-01-01",
        endDate: "2023-01-31",
        activityTypes: "login,vault_access",
      };

      await ActivityMiddleware.getActivityHistory(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      expect(
        mockActivityServiceInstance.getActivityHistory,
      ).toHaveBeenCalledWith(
        "user-123",
        10,
        0,
        new Date("2023-01-01"),
        new Date("2023-01-31"),
        ["login", "vault_access"],
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        activities: mockHistory.activities,
        total: mockHistory.total,
        hasMore: false,
        pagination: {
          limit: 10,
          offset: 0,
          total: 1,
        },
      });
    });

    it("should use default parameters when not provided", async () => {
      const mockHistory = { activities: [], total: 0 };
      mockActivityServiceInstance.getActivityHistory = jest
        .fn()
        .mockResolvedValue(mockHistory);

      mockRequest.query = {};

      await ActivityMiddleware.getActivityHistory(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      expect(
        mockActivityServiceInstance.getActivityHistory,
      ).toHaveBeenCalledWith(
        "user-123",
        50, // default limit
        0, // default offset
        undefined, // no start date
        undefined, // no end date
        undefined, // no activity types filter
      );
    });
  });

  describe("specific activity middleware", () => {
    it("should create login tracking middleware", () => {
      const middleware = ActivityMiddleware.trackLogin();
      expect(middleware).toBeInstanceOf(Function);
    });

    it("should create vault access tracking middleware", () => {
      const middleware = ActivityMiddleware.trackVaultAccess();
      expect(middleware).toBeInstanceOf(Function);
    });

    it("should create settings change tracking middleware", () => {
      const middleware = ActivityMiddleware.trackSettingsChange();
      expect(middleware).toBeInstanceOf(Function);
    });

    it("should create successor management tracking middleware", () => {
      const middleware = ActivityMiddleware.trackSuccessorManagement();
      expect(middleware).toBeInstanceOf(Function);
    });
  });
});
