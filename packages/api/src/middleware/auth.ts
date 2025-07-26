import { Request, Response, NextFunction } from 'express';
import { JWTManager, JWTPayload } from '../auth/jwt';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTManager.extractTokenFromHeader(authHeader || '');

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    if (JWTManager.isTokenExpired(token)) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }

    const decoded = JWTManager.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTManager.extractTokenFromHeader(authHeader || '');

    if (token && !JWTManager.isTokenExpired(token)) {
      const decoded = JWTManager.verifyToken(token);
      req.user = decoded;
    }
  } catch (error) {
    // Silently ignore invalid tokens for optional auth
  }
  next();
}; 