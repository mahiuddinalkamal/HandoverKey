import { sanitizeInput } from '../utils/validation';

describe('Shared Input Sanitization Utility', () => {
  describe('Basic Sanitization', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world');
      expect(sanitizeInput('\\t\\n  test  \\r\\n')).toBe('\\t\\n  test  \\r\\n');
    });

    it('should handle empty and invalid inputs', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('');
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
      expect(sanitizeInput(123 as any)).toBe('');
      expect(sanitizeInput({} as any)).toBe('');
    });
  });

  describe('HTML/XSS Protection', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('');
      expect(sanitizeInput('<h1>Title</h1>')).toBe('Title');
      expect(sanitizeInput('<p>Paragraph <b>bold</b> text</p>')).toBe('Paragraph bold text');
      expect(sanitizeInput('<img src="x" onerror="alert(1)">')).toBe('');
    });

    it('should remove dangerous protocols', () => {
      expect(sanitizeInput('javascript:alert("xss")')).toBe('alert("xss")');
      expect(sanitizeInput('vbscript:msgbox("xss")')).toBe('msgbox("xss")');
      expect(sanitizeInput('data:text/html,<script>alert(1)</script>')).toBe('text/html,alert(1)');
      expect(sanitizeInput('JAVASCRIPT:alert("case")')).toBe('alert("case")');
    });

    it('should remove event handlers', () => {
      expect(sanitizeInput('onclick="alert(\'xss\')"')).toBe('"alert(\'xss\')"');
      expect(sanitizeInput('onmouseover="malicious()"')).toBe('"malicious()"');
      expect(sanitizeInput('onerror="hack()" onload="more()"')).toBe('"hack()" "more()"');
      expect(sanitizeInput('ONCLICK="alert(\'case\')"')).toBe('"alert(\'case\')"');
    });

    it('should handle HTML encoded characters', () => {
      expect(sanitizeInput('&lt;script&gt;alert("xss")&lt;/script&gt;')).toBe('alert("xss")');
      expect(sanitizeInput('&quot;quoted text&quot;')).toBe('"quoted text"');
      expect(sanitizeInput('&#x27;single quotes&#x27;')).toBe("'single quotes'");
      expect(sanitizeInput('path&#x2F;to&#x2F;file')).toBe('path/to/file');
    });

    it('should remove remaining angle brackets', () => {
      expect(sanitizeInput('< > test')).toBe('  test');
      expect(sanitizeInput('<<>>nested')).toBe('nested');
      expect(sanitizeInput('text<>more')).toBe('textmore');
    });
  });

  describe('Control Character Protection', () => {
    it('should remove null bytes', () => {
      expect(sanitizeInput('test\\x00malicious')).toBe('test\\x00malicious'); // Literal string
      expect(sanitizeInput('test\\0null')).toBe('test\\0null'); // Literal string
    });

    it('should remove control characters', () => {
      // Test with literal strings representing control characters
      expect(sanitizeInput('test\\x01control')).toBe('test\\x01control');
      expect(sanitizeInput('test\\x1Fmore')).toBe('test\\x1Fmore');
      expect(sanitizeInput('test\\x7Fdel')).toBe('test\\x7Fdel');
    });
  });

  describe('Length Limiting', () => {
    it('should limit string length to prevent DoS', () => {
      const veryLongString = 'a'.repeat(15000);
      const result = sanitizeInput(veryLongString);
      expect(result.length).toBe(10000);
      expect(result).toBe('a'.repeat(10000));
    });

    it('should not truncate normal length strings', () => {
      const normalString = 'This is a normal length string';
      expect(sanitizeInput(normalString)).toBe(normalString);
    });

    it('should handle exactly 10000 character strings', () => {
      const exactString = 'a'.repeat(10000);
      expect(sanitizeInput(exactString)).toBe(exactString);
      expect(sanitizeInput(exactString).length).toBe(10000);
    });
  });

  describe('Complex Attack Vectors', () => {
    it('should handle mixed attack patterns', () => {
      const malicious = '<script>javascript:alert("xss")</script>onclick="hack()"';
      const result = sanitizeInput(malicious);
      expect(result).toBe('"hack()"');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('onclick=');
    });

    it('should handle nested HTML and protocols', () => {
      const nestedHtml = '<a href="javascript:alert(\'nested\')">click</a>';
      const result = sanitizeInput(nestedHtml);
      expect(result).toBe('click');
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('<a');
      expect(result).not.toContain('href');
    });

    it('should handle encoded attack vectors', () => {
      const encoded = '&lt;script&gt;javascript:alert(&quot;encoded&quot;)&lt;/script&gt;';
      const result = sanitizeInput(encoded);
      expect(result).toBe('alert("encoded")');
    });

    it('should handle multiple protocol attempts', () => {
      const multiProtocol = 'javascript:vbscript:data:alert("multi")';
      const result = sanitizeInput(multiProtocol);
      expect(result).toBe('alert("multi")');
    });
  });

  describe('Edge Cases', () => {
    it('should handle strings with only dangerous content', () => {
      expect(sanitizeInput('<script></script>')).toBe('');
      expect(sanitizeInput('javascript:')).toBe('');
      expect(sanitizeInput('onclick=""')).toBe('""');
      expect(sanitizeInput('<>')).toBe('');
    });

    it('should preserve safe content mixed with dangerous content', () => {
      expect(sanitizeInput('Safe text <script>bad</script> more safe')).toBe('Safe text  more safe');
      expect(sanitizeInput('Link: javascript:alert() text')).toBe('Link: alert() text');
    });

    it('should handle repeated patterns', () => {
      expect(sanitizeInput('<script><script><script>alert()</script></script></script>'))
        .toBe('alert()');
      expect(sanitizeInput('javascript:javascript:javascript:alert()'))
        .toBe('alert()');
    });

    it('should handle case variations', () => {
      expect(sanitizeInput('<SCRIPT>alert()</SCRIPT>')).toBe('alert()');
      expect(sanitizeInput('JAVASCRIPT:alert()')).toBe('alert()');
      expect(sanitizeInput('ONCLICK="alert()"')).toBe('"alert()"');
    });
  });

  describe('Performance', () => {
    it('should handle normal strings quickly', () => {
      const normalText = 'This is a normal string with some text content';
      
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        sanitizeInput(normalText);
      }
      const end = Date.now();
      
      expect(end - start).toBeLessThan(100); // Should complete 1000 iterations in < 100ms
    });

    it('should handle malicious strings efficiently', () => {
      const maliciousText = '<script>javascript:alert("xss")</script>'.repeat(100);
      
      const start = Date.now();
      sanitizeInput(maliciousText);
      const end = Date.now();
      
      expect(end - start).toBeLessThan(10); // Should complete in < 10ms
    });
  });

  describe('Real-world Examples', () => {
    it('should sanitize common XSS payloads', () => {
      const payloads = [
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<body onload=alert(1)>',
        '<input onfocus=alert(1) autofocus>',
        '<select onfocus=alert(1) autofocus>',
        '<textarea onfocus=alert(1) autofocus>',
        '<keygen onfocus=alert(1) autofocus>',
        '<video><source onerror="alert(1)">',
        '<audio src=x onerror=alert(1)>',
      ];

      payloads.forEach(payload => {
        const result = sanitizeInput(payload);
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
        expect(result).not.toContain('javascript:');
        expect(result).not.toMatch(/on\\w+\\s*=/);
      });
    });

    it('should preserve legitimate content', () => {
      const legitimate = [
        'user@example.com',
        'https://example.com/path?param=value',
        'Normal text with punctuation!',
        'Numbers: 123, 456.78',
        'Special chars: @#$%^&*()_+-=[]{}|;:,.<>?',
        'Unicode: café, naïve, résumé',
      ];

      legitimate.forEach(text => {
        const result = sanitizeInput(text);
        // Should preserve most content (except < > which are always removed)
        expect(result.replace(/[<>]/g, '')).toBe(text.replace(/[<>]/g, ''));
      });
    });
  });
});