import { Request, Response } from "express";
import { AuthController } from "../../controllers/auth-controller";
import { UserService } from "../../services/user-service";
import { JWTManager } from "../../auth/jwt";
import { validationResult } from "express-validator";

// Mock dependencies
jest.mock("../../services/user-service");
jest.mock("../../auth/jwt");
jest.mock("express-validator", () => ({
  body: jest.fn(() => ({
    isEmail: jest.fn().mockReturnThis(),
    normalizeEmail: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    matches: jest.fn().mockReturnThis(),
    custom: jest.fn().mockReturnThis(),
    notEmpty: jest.fn().mockReturnThis(),
  })),
  validationResult: jest.fn(),
}));

const mockUserService = UserService as jest.Mocked<typeof UserService>;
const mockJWTManager = JWTManager as jest.Mocked<typeof JWTManager>;
const mockValidationResult = validationResult as jest.MockedFunction<
  typeof validationResult
>;

describe("Auth Controller Security Bypass Tests", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      body: {},
      ip: "192.168.1.1",
      get: jest.fn().mockReturnValue("test-user-agent"),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Mock validation to pass by default
    mockValidationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    } as any);

    // Mock JWT Manager
    mockJWTManager.generateAccessToken.mockReturnValue("mock-access-token");
    mockJWTManager.generateRefreshToken.mockReturnValue("mock-refresh-token");

    // Mock UserService methods
    mockUserService.logActivity.mockResolvedValue(undefined);
    mockUserService.findUserByEmail.mockResolvedValue(null);

    consoleSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("Login Security Tests", () => {
    it("should reject non-string email input", async () => {
      mockRequest.body = {
        email: 123, // Non-string input
        password: "password123",
      };

      await AuthController.login(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid input format",
      });
      expect(mockUserService.authenticateUser).not.toHaveBeenCalled();
    });

    it("should reject non-string password input", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: { malicious: "object" }, // Non-string input
      };

      await AuthController.login(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid input format",
      });
      expect(mockUserService.authenticateUser).not.toHaveBeenCalled();
    });

    it("should reject empty email input", async () => {
      mockRequest.body = {
        email: "", // Empty string
        password: "password123",
      };

      await AuthController.login(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid email or password",
      });
      expect(mockUserService.authenticateUser).not.toHaveBeenCalled();
    });

    it("should reject empty password input", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "", // Empty string
      };

      await AuthController.login(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid email or password",
      });
      expect(mockUserService.authenticateUser).not.toHaveBeenCalled();
    });

    it("should trim email input to prevent bypass", async () => {
      mockRequest.body = {
        email: "  test@example.com  ", // Email with spaces
        password: "password123",
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        twoFactorEnabled: false,
      };

      mockUserService.authenticateUser.mockResolvedValue(mockUser as any);

      await AuthController.login(
        mockRequest as Request,
        mockResponse as Response,
      );

      // Should call authenticateUser with trimmed email
      expect(mockUserService.authenticateUser).toHaveBeenCalledWith({
        email: "test@example.com", // Trimmed
        password: "password123",
        twoFactorCode: undefined,
      });
    });

    it("should enforce 2FA when enabled", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "password123",
        // No 2FA code provided
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        twoFactorEnabled: true, // 2FA enabled
      };

      mockUserService.authenticateUser.mockResolvedValue(mockUser as any);

      await AuthController.login(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Two-factor authentication required",
        requires2FA: true,
      });
    });

    it("should reject non-string 2FA code", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "password123",
        twoFactorCode: 123456, // Non-string 2FA code
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        twoFactorEnabled: true,
      };

      mockUserService.authenticateUser.mockResolvedValue(mockUser as any);

      await AuthController.login(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Two-factor authentication required",
        requires2FA: true,
      });
    });

    it("should reject empty 2FA code when 2FA is enabled", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "password123",
        twoFactorCode: "   ", // Empty/whitespace 2FA code
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        twoFactorEnabled: true,
      };

      mockUserService.authenticateUser.mockResolvedValue(mockUser as any);

      await AuthController.login(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Two-factor authentication required",
        requires2FA: true,
      });
    });
  });

  describe("Registration Security Tests", () => {
    it("should reject non-string email input", async () => {
      mockRequest.body = {
        email: ["malicious@array.com"], // Non-string input
        password: "password123",
        confirmPassword: "password123",
      };

      await AuthController.register(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid input format",
      });
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });

    it("should reject non-string password input", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: null, // Non-string input
        confirmPassword: "password123",
      };

      await AuthController.register(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid input format",
      });
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });

    it("should reject non-string confirmPassword input", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "password123",
        confirmPassword: undefined, // Non-string input
      };

      await AuthController.register(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid input format",
      });
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });

    it("should reject empty fields", async () => {
      const emptyFieldTests = [
        { email: "", password: "password123", confirmPassword: "password123" },
        {
          email: "test@example.com",
          password: "",
          confirmPassword: "password123",
        },
        {
          email: "test@example.com",
          password: "password123",
          confirmPassword: "",
        },
      ];

      for (const testCase of emptyFieldTests) {
        jest.clearAllMocks();
        mockRequest.body = testCase;

        await AuthController.register(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: "All fields are required",
        });
        expect(mockUserService.createUser).not.toHaveBeenCalled();
      }
    });

    it("should enforce password confirmation match", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "password123",
        confirmPassword: "differentpassword", // Passwords don't match
      };

      await AuthController.register(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Passwords do not match",
      });
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });

    it("should normalize email input", async () => {
      mockRequest.body = {
        email: "  TEST@EXAMPLE.COM  ", // Mixed case with spaces
        password: "password123",
        confirmPassword: "password123",
      };

      const mockUser = { id: "user123", email: "test@example.com" };
      mockUserService.createUser.mockResolvedValue(mockUser as any);

      await AuthController.register(
        mockRequest as Request,
        mockResponse as Response,
      );

      // Should call createUser with normalized email
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        email: "test@example.com", // Normalized
        password: "password123",
        confirmPassword: "password123",
      });
    });
  });

  describe("Security Edge Cases", () => {
    it("should handle validation errors securely", async () => {
      // Mock validation failure
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: "Validation error", param: "email" }],
      } as any);

      mockRequest.body = {
        email: "invalid-email",
        password: "password123",
      };

      await AuthController.login(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Validation failed",
        details: [{ msg: "Validation error", param: "email" }],
      });
    });

    it("should handle service errors without leaking information", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "password123",
      };

      // Mock service error
      mockUserService.authenticateUser.mockRejectedValue(
        new Error("Database connection failed"),
      );

      await AuthController.login(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Internal server error",
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Login error:",
        expect.any(Error),
      );
    });

    it("should handle very long input strings", async () => {
      const veryLongString = "a".repeat(10000);

      mockRequest.body = {
        email: veryLongString + "@example.com",
        password: veryLongString,
      };

      // Mock authenticateUser to reject long strings
      mockUserService.authenticateUser.mockRejectedValue(
        new Error("Invalid credentials"),
      );

      const start = Date.now();
      await AuthController.login(
        mockRequest as Request,
        mockResponse as Response,
      );
      const end = Date.now();

      // Should complete quickly even with very long input
      expect(end - start).toBeLessThan(100);
      expect(mockResponse.status).toHaveBeenCalledWith(500); // Will be 500 due to service error
    });

    it("should not be vulnerable to prototype pollution", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "password123",
        __proto__: { isAdmin: true },
        constructor: { prototype: { isAdmin: true } },
      };

      // Mock authenticateUser to return null (invalid credentials)
      mockUserService.authenticateUser.mockResolvedValue(null);

      await AuthController.login(
        mockRequest as Request,
        mockResponse as Response,
      );

      // Should not have polluted the prototype
      expect((Object.prototype as any).isAdmin).toBeUndefined();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it("should handle null and undefined body gracefully", async () => {
      // Test with null body
      jest.clearAllMocks();
      mockRequest.body = null as any;

      await AuthController.login(
        mockRequest as Request,
        mockResponse as Response,
      );

      // Null body will cause 500 error when trying to access properties
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockUserService.authenticateUser).not.toHaveBeenCalled();

      // Test with undefined body
      jest.clearAllMocks();
      mockRequest.body = undefined as any;

      await AuthController.login(
        mockRequest as Request,
        mockResponse as Response,
      );

      // Undefined body will cause 500 error when trying to access properties
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockUserService.authenticateUser).not.toHaveBeenCalled();

      // Test with empty object body
      jest.clearAllMocks();
      mockRequest.body = {};

      await AuthController.login(
        mockRequest as Request,
        mockResponse as Response,
      );

      // Empty object will be caught by input validation and return 400
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockUserService.authenticateUser).not.toHaveBeenCalled();
    });

    it("should prevent timing attacks on login", async () => {
      const times: number[] = [];

      // Test with various invalid credentials
      const testCases = [
        { email: "nonexistent@example.com", password: "password123" },
        { email: "test@example.com", password: "wrongpassword" },
        { email: "", password: "" },
        { email: "a".repeat(100), password: "b".repeat(100) },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        mockRequest.body = testCase;

        mockUserService.authenticateUser.mockRejectedValue(
          new Error("Invalid credentials"),
        );

        const start = Date.now();
        await AuthController.login(
          mockRequest as Request,
          mockResponse as Response,
        );
        const end = Date.now();

        times.push(end - start);
      }

      // All invalid login attempts should take similar time
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const timeDifference = maxTime - minTime;

      // Should not have significant timing differences (< 50ms variance)
      expect(timeDifference).toBeLessThan(50);
    });
  });
});
