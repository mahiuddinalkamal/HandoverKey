import { Response } from "express";
import { InactivityController } from "../../controllers/inactivity-controller";
import { DatabaseConnection } from "@handoverkey/database";
import { ActivityService } from "../../services/activity-service";
import { AuthenticatedRequest } from "../../middleware/auth";

// Mock dependencies
jest.mock("@handoverkey/database");
jest.mock("../../services/activity-service");

const mockDatabaseConnection = DatabaseConnection as jest.Mocked<
  typeof DatabaseConnection
>;
const mockActivityService = ActivityService as jest.MockedClass<
  typeof ActivityService
>;

describe("InactivityController", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      user: {
        userId: "user-123",
        email: "test@example.com",
        sessionId: "session-123",
      },
      body: {},
    };

    mockResponse = {
      json: mockJson,
      status: mockStatus,
    };

    jest.clearAllMocks();
  });

  describe("getSettings", () => {
    it("should return existing settings", async () => {
      const mockSettings = {
        threshold_days: 90,
        notification_methods: ["email"],
        emergency_contacts: null,
        is_paused: false,
        pause_reason: null,
        paused_until: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDatabaseConnection.query.mockResolvedValueOnce({
        rows: [mockSettings],
      } as any);

      await InactivityController.getSettings(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        ["user-123"],
      );
      expect(mockJson).toHaveBeenCalledWith(mockSettings);
    });

    it("should handle unauthenticated user", async () => {
      mockRequest.user = undefined;

      await InactivityController.getSettings(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: "User not authenticated",
      });
    });
  });

  describe("updateThreshold", () => {
    beforeEach(() => {
      // Mock validation result
      jest.doMock("express-validator", () => ({
        validationResult: jest.fn().mockReturnValue({ isEmpty: () => true }),
      }));
    });

    it("should update threshold successfully", async () => {
      mockRequest.body = { threshold_days: 120 };

      const mockCurrentSettings = { threshold_days: 90 };
      const mockUpdatedSettings = {
        threshold_days: 120,
        updated_at: new Date(),
      };

      mockDatabaseConnection.query
        .mockResolvedValueOnce({ rows: [mockCurrentSettings] } as any) // current settings
        .mockResolvedValueOnce({ rows: [mockUpdatedSettings] } as any); // update

      const mockActivityServiceInstance = {
        recordActivity: jest.fn(),
      };
      mockActivityService.mockImplementation(
        () => mockActivityServiceInstance as any,
      );

      await InactivityController.updateThreshold(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE inactivity_settings"),
        ["user-123", 120],
      );
      expect(mockJson).toHaveBeenCalledWith({
        message: "Threshold updated successfully",
        threshold_days: 120,
        updated_at: mockUpdatedSettings.updated_at,
      });
    });
  });
});
