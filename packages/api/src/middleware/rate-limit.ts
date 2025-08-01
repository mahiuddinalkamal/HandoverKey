import { Request, Response, NextFunction } from 'express';
/* eslint-env node */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstAttempt: number;
}

interface SecurityEvent {
  timestamp: number;
  ip: string;
  userAgent: string;
  endpoint: string;
  reason: string;
}

class RateLimitManager {
  private static instance: RateLimitManager;
  private attempts: Map<string, RateLimitEntry> = new Map();
  private securityEvents: SecurityEvent[] = [];
  private readonly maxEvents = 1000; // Keep last 1000 security events

  static getInstance(): RateLimitManager {
    if (!RateLimitManager.instance) {
      RateLimitManager.instance = new RateLimitManager();
    }
    return RateLimitManager.instance;
  }

  private getKey(ip: string, endpoint: string): string {
    return `${ip}:${endpoint}`;
  }

  private logSecurityEvent(req: Request, reason: string): void {
    const event: SecurityEvent = {
      timestamp: Date.now(),
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      endpoint: req.path,
      reason,
    };

    this.securityEvents.push(event);
    
    // Keep only the most recent events
    if (this.securityEvents.length > this.maxEvents) {
      this.securityEvents = this.securityEvents.slice(-this.maxEvents);
    }

    // Log to console for monitoring
    console.warn(`Security Event: ${reason} from ${event.ip} on ${event.endpoint}`, {
      timestamp: new Date(event.timestamp).toISOString(),
      userAgent: event.userAgent,
    });
  }

  checkRateLimit(
    req: Request,
    maxAttempts: number,
    windowMs: number,
    endpoint: string
  ): { allowed: boolean; resetTime?: number; attemptsRemaining?: number } {
    const key = this.getKey(req.ip || 'unknown', endpoint);
    const now = Date.now();
    const entry = this.attempts.get(key);

    if (!entry) {
      // First attempt
      this.attempts.set(key, {
        count: 1,
        resetTime: now + windowMs,
        firstAttempt: now,
      });
      return { allowed: true, attemptsRemaining: maxAttempts - 1 };
    }

    if (now > entry.resetTime) {
      // Window has expired, reset
      this.attempts.set(key, {
        count: 1,
        resetTime: now + windowMs,
        firstAttempt: now,
      });
      return { allowed: true, attemptsRemaining: maxAttempts - 1 };
    }

    if (entry.count >= maxAttempts) {
      // Rate limit exceeded
      this.logSecurityEvent(req, `Rate limit exceeded: ${entry.count} attempts in ${windowMs}ms`);
      return { 
        allowed: false, 
        resetTime: entry.resetTime,
        attemptsRemaining: 0 
      };
    }

    // Increment counter
    entry.count++;
    this.attempts.set(key, entry);

    return { 
      allowed: true, 
      attemptsRemaining: maxAttempts - entry.count 
    };
  }

  recordValidationFailure(req: Request, validationErrors: any[]): void {
    const errorTypes = validationErrors.map(err => err.param || 'unknown').join(', ');
    this.logSecurityEvent(req, `Validation failure: ${errorTypes}`);
  }

  getSecurityEvents(limit: number = 100): SecurityEvent[] {
    return this.securityEvents.slice(-limit);
  }

  // Clean up old entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.attempts.entries()) {
      if (now > entry.resetTime) {
        this.attempts.delete(key);
      }
    }
  }
}

// Rate limiting middleware factory
export function createRateLimit(options: {
  maxAttempts: number;
  windowMs: number;
  endpoint: string;
  message?: string;
}) {
  const rateLimitManager = RateLimitManager.getInstance();

  return (req: Request, res: Response, next: NextFunction): void => {
    const result = rateLimitManager.checkRateLimit(
      req,
      options.maxAttempts,
      options.windowMs,
      options.endpoint
    );

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime! - Date.now()) / 1000);
      
      res.set({
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': options.maxAttempts.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(result.resetTime!).toISOString(),
      });

      res.status(429).json({
        error: options.message || 'Too many requests',
        retryAfter,
      });
      return;
    }

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': options.maxAttempts.toString(),
      'X-RateLimit-Remaining': result.attemptsRemaining!.toString(),
    });

    next();
  };
}

// Validation failure logging middleware
export function logValidationFailures(req: Request, res: Response, next: NextFunction): void {
  const rateLimitManager = RateLimitManager.getInstance();
  
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to intercept validation errors
  res.json = function(body: any) {
    if (res.statusCode === 400 && body.error === 'Validation failed' && body.details) {
      rateLimitManager.recordValidationFailure(req, body.details);
    }
    
    // Call original json method
    return originalJson.call(this, body);
  };
  
  next();
}

// Specific rate limiters for different endpoints
export const authRateLimit = createRateLimit({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  endpoint: 'auth',
  message: 'Too many authentication attempts, please try again later',
});

export const validationRateLimit = createRateLimit({
  maxAttempts: 20,
  windowMs: 5 * 60 * 1000, // 5 minutes
  endpoint: 'validation',
  message: 'Too many validation failures, please check your input',
});

export const generalRateLimit = createRateLimit({
  maxAttempts: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
  endpoint: 'general',
  message: 'Too many requests, please slow down',
});

// Security monitoring endpoint (for admin use)
export function getSecurityEvents(req: Request, res: Response): void {
  const rateLimitManager = RateLimitManager.getInstance();
  const limit = parseInt((req.query?.limit as string) || '100') || 100;
  const events = rateLimitManager.getSecurityEvents(limit);
  
  res.json({
    events,
    total: events.length,
  });
}

// Cleanup task (should be called periodically)
export function cleanupRateLimits(): void {
  const rateLimitManager = RateLimitManager.getInstance();
  rateLimitManager.cleanup();
}

// Start cleanup interval (only in production)
let cleanupInterval: ReturnType<typeof setInterval> | null = null;
if (process.env.NODE_ENV !== 'test') {
  cleanupInterval = setInterval(cleanupRateLimits, 5 * 60 * 1000); // Clean up every 5 minutes
}

// Export for testing
export { cleanupInterval };