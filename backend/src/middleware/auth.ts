import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseToken, isFirebaseConfigured } from '../services/firebaseService.js';
import { sendError } from '../lib/errors.js';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  displayName?: string;
  role: string;
  emailVerified?: boolean;
  claims?: Record<string, unknown>;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware that strictly requires a valid Firebase Bearer ID token in Authorization header.
 * Attaches decoded user data and role claims to req.user.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!isFirebaseConfigured()) {
    sendError(
      res,
      503,
      'FIREBASE_NOT_CONFIGURED',
      'Firebase Authentication is not configured on the server. Please check environment variables.'
    );
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(
      res,
      401,
      'UNAUTHORIZED',
      'Authentication required. Provide a valid Bearer token in the Authorization header.'
    );
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    sendError(res, 401, 'EMPTY_TOKEN', 'Authorization Bearer token is empty.');
    return;
  }

  try {
    const decoded = await verifyFirebaseToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      displayName: decoded.name,
      role: (decoded.role as string) || 'analyst',
      emailVerified: decoded.email_verified,
      claims: decoded,
    };
    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid or expired token';
    sendError(res, 401, 'INVALID_TOKEN', `Authentication failed: ${message}`);
  }
};

/**
 * Middleware that populates req.user if a valid Bearer token is present,
 * but allows unauthenticated requests to continue through without failing.
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ') || !isFirebaseConfigured()) {
    return next();
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return next();
  }

  try {
    const decoded = await verifyFirebaseToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      displayName: decoded.name,
      role: (decoded.role as string) || 'analyst',
      emailVerified: decoded.email_verified,
      claims: decoded,
    };
  } catch {
    // Gracefully ignore invalid tokens in optional auth
  }
  next();
};

/**
 * Role-based access control middleware generator.
 * Example: requireRole('admin', 'investigator')
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication is required for this operation');
      return;
    }

    const userRole = req.user.role || 'analyst';
    if (!allowedRoles.includes(userRole)) {
      sendError(
        res,
        403,
        'FORBIDDEN',
        `Access denied. Requires one of: [${allowedRoles.join(', ')}]. Current role: ${userRole}`,
        { requiredRoles: allowedRoles, currentRole: userRole }
      );
      return;
    }

    next();
  };
};
