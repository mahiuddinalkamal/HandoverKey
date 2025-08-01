import { sanitizeInput } from '../utils/validation';

describe('Simple Sanitize Test', () => {
  it('should work with basic input', () => {
    const result = sanitizeInput('hello world');
    expect(result).toBe('hello world');
  });

  it('should handle null input', () => {
    const result = sanitizeInput(null as any);
    expect(result).toBe('');
  });

  it('should remove script tags', () => {
    const result = sanitizeInput('<script>alert("test")</script>');
    expect(result).toBe('alert("test")');
  });
});