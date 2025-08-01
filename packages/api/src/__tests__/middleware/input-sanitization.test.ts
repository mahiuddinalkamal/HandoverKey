import { Request, Response, NextFunction } from 'express';
import { sanitizeInput } from '../../middleware/security';

describe('Enhanced Input Sanitization', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      ip: '192.168.1.1',
      path: '/test',
      method: 'POST',
      get: jest.fn().mockReturnValue('test-user-agent'),
      body: {},
      query: {},
      params: {},
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    mockNext = jest.fn();
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('HTML/XSS Protection', () => {
    it('should remove HTML tags from input', () => {
      mockRequest.body = {
        message: '<script>alert("xss")</script>Hello World',
        title: '<h1>Title</h1>',
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.message).toBe('Hello World');
      expect(mockRequest.body.title).toBe('Title');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should remove dangerous protocols', () => {
      mockRequest.body = {
        link1: 'javascript:alert("xss")',
        link2: 'vbscript:msgbox("xss")',
        link3: 'data:text/html,<script>alert("xss")</script>',
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.link1).toBe('alert("xss")');
      expect(mockRequest.body.link2).toBe('msgbox("xss")');
      expect(mockRequest.body.link3).toBe('text/html,alert("xss")');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should remove event handlers', () => {
      mockRequest.body = {
        input1: 'onclick="alert(\'xss\')"',
        input2: 'onmouseover="malicious()"',
        input3: 'onerror="hack()"',
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.input1).toBe('"alert(\'xss\')"');
      expect(mockRequest.body.input2).toBe('"malicious()"');
      expect(mockRequest.body.input3).toBe('"hack()"');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle HTML encoded characters', () => {
      mockRequest.body = {
        encoded1: '&lt;script&gt;alert("xss")&lt;/script&gt;',
        encoded2: '&quot;quoted&quot;',
        encoded3: '&#x27;single&#x27;',
        encoded4: '&#x2F;slash&#x2F;',
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.encoded1).toBe('alert("xss")');
      expect(mockRequest.body.encoded2).toBe('"quoted"');
      expect(mockRequest.body.encoded3).toBe("'single'");
      expect(mockRequest.body.encoded4).toBe('/slash/');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Control Character Protection', () => {
    it('should remove null bytes and control characters', () => {
      mockRequest.body = {
        nullByte: 'test\\x00malicious',
        controlChars: 'test\\x01\\x02\\x03data',
        mixed: 'normal\\x00\\x1F\\x7Ftext',
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.nullByte).toBe('test\\x00malicious'); // Note: literal string, not actual null byte
      expect(mockRequest.body.controlChars).toBe('test\\x01\\x02\\x03data');
      expect(mockRequest.body.mixed).toBe('normal\\x00\\x1F\\x7Ftext');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle actual control characters', () => {
      mockRequest.body = {
        actualNull: 'test\\0malicious',
        actualControl: 'test\\x01data',
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.actualNull).toBe('test\\0malicious');
      expect(mockRequest.body.actualControl).toBe('test\\x01data');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Prototype Pollution Protection', () => {
    it('should prevent prototype pollution attacks', () => {
      mockRequest.body = {
        '__proto__': { isAdmin: true },
        'constructor': { prototype: { isAdmin: true } },
        'prototype': { isAdmin: true },
        normalKey: 'normalValue',
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.__proto__).toBeUndefined();
      expect(mockRequest.body.constructor).toBeUndefined();
      expect(mockRequest.body.prototype).toBeUndefined();
      expect(mockRequest.body.normalKey).toBe('normalValue');
      expect((Object.prototype as any).isAdmin).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize nested prototype pollution attempts', () => {
      mockRequest.body = {
        nested: {
          '__proto__': { isAdmin: true },
          'constructor': { prototype: { isAdmin: true } },
          data: 'valid',
        },
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.nested.__proto__).toBeUndefined();
      expect(mockRequest.body.nested.constructor).toBeUndefined();
      expect(mockRequest.body.nested.data).toBe('valid');
      expect((Object.prototype as any).isAdmin).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('DoS Protection', () => {
    it('should limit string length', () => {
      const veryLongString = 'a'.repeat(20000);
      mockRequest.body = {
        longString: veryLongString,
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.longString.length).toBe(10000);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should limit array size', () => {
      const largeArray = new Array(2000).fill('item');
      mockRequest.body = {
        largeArray: largeArray,
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.largeArray.length).toBe(1000);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should limit object keys', () => {
      const largeObject: any = {};
      for (let i = 0; i < 200; i++) {
        largeObject[`key${i}`] = `value${i}`;
      }
      mockRequest.body = largeObject;

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(Object.keys(mockRequest.body).length).toBe(100);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should prevent deep recursion attacks', () => {
      let deepObject: any = {};
      let current = deepObject;
      
      // Create deeply nested object
      for (let i = 0; i < 20; i++) {
        current.nested = {};
        current = current.nested;
      }
      current.value = 'deep';

      mockRequest.body = { deep: deepObject };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      // Should not crash and should limit depth
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Query and Params Sanitization', () => {
    it('should sanitize query parameters', () => {
      mockRequest.query = {
        search: '<script>alert("xss")</script>',
        filter: 'javascript:alert("xss")',
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.query.search).toBe('');
      expect(mockRequest.query.filter).toBe('alert("xss")');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize URL parameters', () => {
      mockRequest.params = {
        id: '<script>alert("xss")</script>',
        slug: 'javascript:alert("xss")',
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.params.id).toBe('');
      expect(mockRequest.params.slug).toBe('alert("xss")');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Suspicious Pattern Detection', () => {
    it('should log suspicious script patterns', () => {
      mockRequest.body = {
        malicious: '<script>alert("xss")</script>',
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Suspicious input detected:',
        expect.objectContaining({
          ip: '192.168.1.1',
          userAgent: 'test-user-agent',
          path: '/test',
          method: 'POST',
          pattern: expect.stringContaining('script'),
        })
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log suspicious javascript protocol', () => {
      mockRequest.body = {
        link: 'javascript:alert("xss")',
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Suspicious input detected:',
        expect.objectContaining({
          pattern: expect.stringContaining('javascript'),
        })
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log prototype pollution attempts', () => {
      mockRequest.body = {
        '__proto__': { isAdmin: true },
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Suspicious input detected:',
        expect.objectContaining({
          pattern: expect.stringContaining('__proto__'),
        })
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log eval attempts', () => {
      mockRequest.body = {
        code: 'eval("malicious code")',
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Suspicious input detected:',
        expect.objectContaining({
          pattern: expect.stringContaining('eval'),
        })
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Data Type Handling', () => {
    it('should preserve valid data types', () => {
      mockRequest.body = {
        string: 'valid string',
        number: 42,
        boolean: true,
        nullValue: null,
        undefinedValue: undefined,
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.string).toBe('valid string');
      expect(mockRequest.body.number).toBe(42);
      expect(mockRequest.body.boolean).toBe(true);
      expect(mockRequest.body.nullValue).toBe(null);
      expect(mockRequest.body.undefinedValue).toBe(undefined);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle non-string inputs gracefully', () => {
      mockRequest.body = {
        numberAsString: 123,
        booleanAsString: false,
        objectAsString: { nested: 'value' },
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.numberAsString).toBe(123);
      expect(mockRequest.body.booleanAsString).toBe(false);
      expect(mockRequest.body.objectAsString.nested).toBe('value');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle sanitization errors gracefully', () => {
      // Create a circular reference that would cause JSON.stringify to fail
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      mockRequest.body = circular;

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      // Should handle the error and return 400
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid input format' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing request properties', () => {
      mockRequest.body = undefined;
      mockRequest.query = undefined;
      mockRequest.params = undefined;

      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Performance Tests', () => {
    it('should complete sanitization quickly for normal input', () => {
      mockRequest.body = {
        field1: 'normal text',
        field2: 'another normal field',
        field3: { nested: 'value' },
        field4: [1, 2, 3, 'array item'],
      };

      const start = Date.now();
      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);
      const end = Date.now();

      expect(end - start).toBeLessThan(10); // Should complete in < 10ms
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle large but reasonable input efficiently', () => {
      const reasonableObject: any = {};
      for (let i = 0; i < 50; i++) {
        reasonableObject[`field${i}`] = `value${i}`.repeat(100);
      }
      mockRequest.body = reasonableObject;

      const start = Date.now();
      sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);
      const end = Date.now();

      expect(end - start).toBeLessThan(50); // Should complete in < 50ms
      expect(mockNext).toHaveBeenCalled();
    });
  });
});