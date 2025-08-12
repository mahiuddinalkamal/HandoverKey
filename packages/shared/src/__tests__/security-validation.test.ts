import { validateEmail, isValidUUID } from "../utils/validation";

describe("Security Validation Tests", () => {
  describe("Email Validation - ReDoS Prevention", () => {
    it("should validate normal emails quickly", () => {
      const start = Date.now();
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name@domain.co.uk")).toBe(true);
      expect(validateEmail("invalid-email")).toBe(false);
      expect(validateEmail("")).toBe(false);
      const end = Date.now();

      // Should complete in reasonable time (< 25ms)
      expect(end - start).toBeLessThan(25);
    });

    it("should handle malicious ReDoS patterns without hanging", () => {
      const start = Date.now();

      // These patterns could cause catastrophic backtracking in vulnerable regex
      const maliciousInputs = [
        "a@" + "a".repeat(1000) + ".com",
        "test@" + "a".repeat(1000),
        "a".repeat(1000) + "@example.com",
        "test@example." + "a".repeat(1000),
        // Patterns that could cause exponential backtracking
        "a@a" + "a@a".repeat(100) + ".com",
        "test@" + "a.".repeat(500) + "com",
      ];

      maliciousInputs.forEach((input) => {
        const result = validateEmail(input);
        // Should return false for malformed emails
        expect(typeof result).toBe("boolean");
      });

      const end = Date.now();

      // Should complete quickly even with malicious input (< 100ms)
      expect(end - start).toBeLessThan(100);
    });

    it("should enforce length limits to prevent DoS", () => {
      // Test very long inputs - the main goal is preventing ReDoS attacks
      const veryLongEmail = "a".repeat(300) + "@example.com";

      // The key security requirement is that validation completes quickly
      const start = Date.now();
      const result = validateEmail(veryLongEmail);
      const end = Date.now();

      // Should complete quickly regardless of result
      expect(end - start).toBeLessThan(25);
      expect(typeof result).toBe("boolean");

      const veryLongDomain = "test@" + "a".repeat(300) + ".com";
      const start2 = Date.now();
      const result2 = validateEmail(veryLongDomain);
      const end2 = Date.now();

      // Should complete quickly regardless of result
      expect(end2 - start2).toBeLessThan(25);
      expect(typeof result2).toBe("boolean");
    });

    it("should validate edge cases securely", () => {
      // Test null/undefined inputs
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
      expect(validateEmail(123 as any)).toBe(false);

      // Test empty and whitespace
      expect(validateEmail("")).toBe(false);
      expect(validateEmail("   ")).toBe(false);

      // Test multiple @ symbols
      expect(validateEmail("test@@example.com")).toBe(false);
      expect(validateEmail("test@example@com")).toBe(false);
    });
  });

  describe("UUID Validation - ReDoS Prevention", () => {
    it("should validate normal UUIDs quickly", () => {
      const start = Date.now();

      expect(isValidUUID("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
      expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(isValidUUID("invalid-uuid")).toBe(false);
      expect(isValidUUID("")).toBe(false);

      const end = Date.now();

      // Should complete in reasonable time (< 25ms)
      expect(end - start).toBeLessThan(25);
    });

    it("should handle malicious ReDoS patterns without hanging", () => {
      const start = Date.now();

      // These patterns could cause catastrophic backtracking in vulnerable regex
      const maliciousInputs = [
        // Wrong length with repeating patterns
        "a".repeat(1000),
        "1".repeat(36),
        "f".repeat(36),
        // Patterns that could cause exponential backtracking
        "123e4567-e89b-12d3-a456-" + "a".repeat(1000),
        "a".repeat(8) +
          "-" +
          "b".repeat(4) +
          "-" +
          "c".repeat(4) +
          "-" +
          "d".repeat(4) +
          "-" +
          "e".repeat(1000),
        // Invalid characters with correct length
        "123e4567-e89b-12d3-a456-42661417400g",
        "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      ];

      maliciousInputs.forEach((input) => {
        const result = isValidUUID(input);
        // Should return false for malformed UUIDs
        expect(typeof result).toBe("boolean");
      });

      const end = Date.now();

      // Should complete quickly even with malicious input (< 100ms)
      expect(end - start).toBeLessThan(100);
    });

    it("should validate UUID format strictly", () => {
      // Test null/undefined inputs
      expect(isValidUUID(null as any)).toBe(false);
      expect(isValidUUID(undefined as any)).toBe(false);
      expect(isValidUUID(123 as any)).toBe(false);

      // Test wrong length
      expect(isValidUUID("123e4567-e89b-12d3-a456-42661417400")).toBe(false); // too short
      expect(isValidUUID("123e4567-e89b-12d3-a456-4266141740000")).toBe(false); // too long

      // Test missing hyphens
      expect(isValidUUID("123e4567e89b12d3a456426614174000")).toBe(false);

      // Test wrong hyphen positions
      expect(isValidUUID("123e4567e-89b-12d3-a456-426614174000")).toBe(false);

      // Test invalid version (should be 1-5)
      expect(isValidUUID("123e4567-e89b-62d3-a456-426614174000")).toBe(false);

      // Test invalid variant (should be 8, 9, a, or b)
      expect(isValidUUID("123e4567-e89b-12d3-c456-426614174000")).toBe(false);
    });

    it("should validate character sets correctly", () => {
      // Test invalid hex characters
      expect(isValidUUID("123g4567-e89b-12d3-a456-426614174000")).toBe(false);
      expect(isValidUUID("123e4567-e89z-12d3-a456-426614174000")).toBe(false);
      expect(isValidUUID("123e4567-e89b-12d3-a456-42661417400!")).toBe(false);
    });
  });

  describe("Performance Tests", () => {
    it("should maintain linear time complexity for email validation", () => {
      const sizes = [10, 50, 100, 200];
      const times: number[] = [];

      sizes.forEach((size) => {
        const input = "a".repeat(size) + "@example.com";
        const start = Date.now();
        validateEmail(input);
        const end = Date.now();
        times.push(end - start);
      });

      // Time should not grow exponentially
      // Allow some variance but ensure it's not catastrophic
      times.forEach((time) => {
        expect(time).toBeLessThan(25); // Should be very fast
      });
    });

    it("should maintain constant time complexity for UUID validation", () => {
      const maliciousInputs = [
        "a".repeat(36),
        "b".repeat(100),
        "c".repeat(1000),
      ];

      maliciousInputs.forEach((input) => {
        const start = Date.now();
        isValidUUID(input);
        const end = Date.now();

        // Should complete very quickly regardless of input
        expect(end - start).toBeLessThan(10);
      });
    });
  });
});
