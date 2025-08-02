import { sanitizeInput } from "../utils/validation";

describe("Simple Sanitize Test", () => {
  it("should work with basic input", () => {
    const result = sanitizeInput("hello world");
    expect(result).toBe("hello world");
  });
});
