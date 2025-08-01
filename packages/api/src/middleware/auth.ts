import { Request, Response, NextFunction } from "express";
import { JWTManager, JWTPayload } from "../auth/jwt";

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    // Secure token extraction - validate header format strictly
    const authHeader = req.headers.authorization;
    
    // Prevent bypass attempts with malformed headers
    if (!authHeader || typeof authHeader !== 'string') {
      res.status(401).json({ error: "No token provided" });
      return;
    }
    
    // Strict Bearer token format validation
    if (!authHeader.startsWith("Bearer ") || authHeader.length < 8) {
      res.status(401).json({ error: "Invalid authorization header format" });
      return;
    }
    
    const token = authHeader.substring(7).trim();
    
    // Validate token is not empty after extraction
    if (!token || token.length === 0) {
      res.status(401).json({ error: "No token provided" });
      return;
    }
    
    // Verify token cryptographically - this also checks expiration
    // Don't rely on separate expiration check that could be bypassed
    const decoded = JWTManager.verifyToken(token);
    
    // Additional validation of decoded payload
    if (!decoded || !decoded.userId || !decoded.email) {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    // Log security events but don't leak information
    console.warn('Authentication failed:', error instanceof Error ? error.message : 'Unknown error');
    res.status(401).json({ error: "Invalid token" });
  }
};

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
};

export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    // Only process if header exists and is properly formatted
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      
      // Only proceed if token is not empty
      if (token && token.length > 0) {
        try {
          // Use verifyToken which includes expiration check
          // Don't use separate expiration check that could be bypassed
          const decoded = JWTManager.verifyToken(token);
          
          // Validate decoded payload
          if (decoded && decoded.userId && decoded.email) {
            req.user = decoded;
          }
        } catch {
          // Invalid token - silently ignore for optional auth
          // But log for security monitoring
          console.warn('Optional auth failed for token');
        }
      }
    }
  } catch (error) {
    // Log unexpected errors but continue
    console.warn('Optional auth error:', error instanceof Error ? error.message : 'Unknown error');
  }
  next();
};
