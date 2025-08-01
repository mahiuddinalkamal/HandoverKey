import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});

export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"), // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? ["https://handoverkey.com", "https://www.handoverkey.com"]
      : ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["X-Total-Count", "X-Page-Count"],
};

export const validateContentType = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    const contentType = req.headers["content-type"];
    if (!contentType || !contentType.includes("application/json")) {
      res.status(400).json({ error: "Content-Type must be application/json" });
      return;
    }
  }
  next();
};

// Enhanced input sanitization with comprehensive security checks
const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  let sanitized = input.trim();
  
  // First decode HTML entities to catch encoded attacks
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
  
  // Remove HTML tags (after decoding entities)
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove remaining angle brackets
  sanitized = sanitized.replace(/[<>]/g, '');
  
  // Remove dangerous protocols
  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Remove null bytes and control characters
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/\x00/g, '');
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Limit length to prevent DoS
  return sanitized.substring(0, 10000);
};

const sanitizeObject = (obj: any, depth: number = 0): any => {
  // Prevent deep recursion attacks
  if (depth > 10) {
    return {};
  }
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    // Limit array size to prevent DoS
    return obj.slice(0, 1000).map(item => sanitizeObject(item, depth + 1));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    const keys = Object.keys(obj);
    
    // Limit number of keys to prevent DoS
    const limitedKeys = keys.slice(0, 100);
    
    for (const key of limitedKeys) {
      // Sanitize key names to prevent prototype pollution
      const sanitizedKey = sanitizeString(key);
      
      // Prevent prototype pollution
      if (key === '__proto__' || 
          key === 'constructor' || 
          key === 'prototype' ||
          sanitizedKey === '__proto__' || 
          sanitizedKey === 'constructor' || 
          sanitizedKey === 'prototype') {
        continue;
      }
      
      sanitized[sanitizedKey] = sanitizeObject(obj[key], depth + 1);
    }
    
    return sanitized;
  }
  
  return obj;
};

export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    // Log suspicious input patterns
    const requestString = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    
    // Check for common attack patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      // eslint-disable-next-line no-control-regex
      /\x00/,
      /__proto__/i,
      /constructor/i,
      /eval\s*\(/i,
      /function\s*\(/i,
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestString)) {
        console.warn('Suspicious input detected:', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          pattern: pattern.toString(),
          timestamp: new Date().toISOString(),
        });
        break;
      }
    }
    
    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(400).json({ error: 'Invalid input format' });
  }
};
