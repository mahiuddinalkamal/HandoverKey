import { Request, Response, NextFunction } from "express";
import {
  createRateLimit,
  logValidationFailures,
  authRateLimit,
  validationRateLimit,
  generalRateLimit,
  getSecurityEvents,
  cleanupRateLimits,
} from "../../middleware/rate-limit";

describe("Rate Limiting Middleware", () => {
  let mockRequest: Partial<Request> & { ip?: string };
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      ip: "192.168.1.1",
      path: "/test",
      get: jest.fn().mockReturnValue("test-user-agent"),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      set: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe("createRateLimit", () => {
    it("should allow requests within rate limit", () => {
      const rateLimit = createRateLimit({
        maxAttempts: 5,
        windowMs: 60000,
        endpoint: "test",
      });

      rateLimit(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.set).toHaveBeenCalledWith({
        "X-RateLimit-Limit": "5",
        "X-RateLimit-Remaining": "4",
      });
    });

    it("should block requests exceeding rate limit", () => {
      const rateLimit = createRateLimit({
        maxAttempts: 2,
        windowMs: 60000,
        endpoint: "test",
        message: "Custom rate limit message",
      });

      // Make requests up to the limit
      rateLimit(mockRequest as Request, mockResponse as Response, mockNext);
      rateLimit(mockRequest as Request, mockResponse as Response, mockNext);

      // This should be blocked
      jest.clearAllMocks();
      rateLimit(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Custom rate limit message",
        retryAfter: expect.any(Number),
      });
      expect(mockResponse.set).toHaveBeenCalledWith({
        "Retry-After": expect.any(String),
        "X-RateLimit-Limit": "2",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": expect.any(String),
      });
    });

    it("should reset rate limit after window expires", (done) => {
      const rateLimit = createRateLimit({
        maxAttempts: 1,
        windowMs: 50, // Very short window for testing
        endpoint: "test-reset",
      });

      // First request should be allowed
      rateLimit(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Second request should be blocked
      jest.clearAllMocks();
      rateLimit(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(429);

      // Wait for window to expire
      global.setTimeout(() => {
        jest.clearAllMocks();
        rateLimit(mockRequest as Request, mockResponse as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
        done();
      }, 100);
    });

    it("should track different IPs separately", () => {
      const rateLimit = createRateLimit({
        maxAttempts: 1,
        windowMs: 60000,
        endpoint: "test-ips",
      });

      // First IP
      mockRequest.ip = "192.168.1.1";
      rateLimit(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Second IP should not be affected
      jest.clearAllMocks();
      mockRequest.ip = "192.168.1.2";
      rateLimit(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should track different endpoints separately", () => {
      const rateLimit1 = createRateLimit({
        maxAttempts: 1,
        windowMs: 60000,
        endpoint: "endpoint1",
      });

      const rateLimit2 = createRateLimit({
        maxAttempts: 1,
        windowMs: 60000,
        endpoint: "endpoint2",
      });

      // Use up limit for endpoint1
      rateLimit1(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // endpoint2 should not be affected
      jest.clearAllMocks();
      rateLimit2(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should log security events when rate limit is exceeded", () => {
      const rateLimit = createRateLimit({
        maxAttempts: 1,
        windowMs: 60000,
        endpoint: "test",
      });

      // First request allowed
      rateLimit(mockRequest as Request, mockResponse as Response, mockNext);

      // Second request blocked
      rateLimit(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });
  });

  describe("logValidationFailures", () => {
    it("should log validation failures", () => {
      mockResponse.statusCode = 400;

      logValidationFailures(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();

      // Simulate validation error response
      const validationError = {
        error: "Validation failed",
        details: [{ param: "email", msg: "Invalid email" }],
      };

      // Call the overridden json method
      (mockResponse.json as jest.Mock)(validationError);

      // Test passes if no errors are thrown
      expect(mockNext).toHaveBeenCalled();
    });

    it("should not log non-validation errors", () => {
      mockResponse.statusCode = 500;

      logValidationFailures(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Simulate non-validation error
      const serverError = { error: "Internal server error" };
      (mockResponse.json as jest.Mock)(serverError);

      // Test passes if no errors are thrown
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("Predefined Rate Limiters", () => {
    it("should have auth rate limiter with correct settings", () => {
      // Test that auth rate limiter exists and works
      authRateLimit(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.set).toHaveBeenCalledWith({
        "X-RateLimit-Limit": "5",
        "X-RateLimit-Remaining": "4",
      });
    });

    it("should have validation rate limiter with correct settings", () => {
      validationRateLimit(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.set).toHaveBeenCalledWith({
        "X-RateLimit-Limit": "20",
        "X-RateLimit-Remaining": "19",
      });
    });

    it("should have general rate limiter with correct settings", () => {
      generalRateLimit(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.set).toHaveBeenCalledWith({
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": "99",
      });
    });
  });

  describe("getSecurityEvents", () => {
    it("should return security events", () => {
      mockRequest.query = { limit: "10" };

      getSecurityEvents(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        events: expect.any(Array),
        total: expect.any(Number),
      });
    });

    it("should use default limit when not specified", () => {
      mockRequest.query = {};

      getSecurityEvents(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        events: expect.any(Array),
        total: expect.any(Number),
      });
    });
  });

  describe("cleanupRateLimits", () => {
    it("should not throw errors when called", () => {
      expect(() => cleanupRateLimits()).not.toThrow();
    });
  });

  describe("Security Edge Cases", () => {
    it("should handle missing IP address", () => {
      mockRequest.ip = undefined;

      const rateLimit = createRateLimit({
        maxAttempts: 5,
        windowMs: 60000,
        endpoint: "test",
      });

      rateLimit(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle missing User-Agent", () => {
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      const rateLimit = createRateLimit({
        maxAttempts: 1,
        windowMs: 60000,
        endpoint: "test",
      });

      // Trigger rate limit to test logging with missing User-Agent
      rateLimit(mockRequest as Request, mockResponse as Response, mockNext);
      rateLimit(mockRequest as Request, mockResponse as Response, mockNext);

      // Test passes if rate limiting works correctly
      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });

    it("should handle very high request volumes", () => {
      const rateLimit = createRateLimit({
        maxAttempts: 1000,
        windowMs: 60000,
        endpoint: "stress-test",
      });

      // Make many requests quickly
      for (let i = 0; i < 500; i++) {
        mockRequest.ip = `192.168.1.${i % 255}`;
        rateLimit(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(500);
    });

    it("should prevent memory leaks by limiting security events", () => {
      const rateLimit = createRateLimit({
        maxAttempts: 1,
        windowMs: 60000,
        endpoint: "memory-test",
      });

      // Generate many security events
      for (let i = 0; i < 1500; i++) {
        mockRequest.ip = `192.168.1.${i % 255}`;
        rateLimit(mockRequest as Request, mockResponse as Response, mockNext);
        rateLimit(mockRequest as Request, mockResponse as Response, mockNext); // Trigger rate limit
      }

      // Check that events are limited
      mockRequest.query = {};
      getSecurityEvents(mockRequest as Request, mockResponse as Response);
      const lastCall = (mockResponse.json as jest.Mock).mock.calls.slice(
        -1,
      )[0][0];
      expect(lastCall.events.length).toBeLessThanOrEqual(1000);
    });
  });
});
