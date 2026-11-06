import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseToken, isFirebaseConfigured } from '../services/firebaseService.js';
import { sendError } from '../lib/errors.js';
import { UserMembership, IUserMembership } from '../models/UserMembership.js';
import { Provider, IProvider } from '../models/Provider.js';
import { isDatabaseConnected } from '../config/database.js';

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
      provider?: IProvider;
      membership?: IUserMembership;
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

/** Alias for requireAuth */
export const verifyFirebaseTokenMiddleware = requireAuth;

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

    // If database is connected, attempt to resolve provider as well
    if (isDatabaseConnected()) {
      const membership = await UserMembership.findOne({
        firebaseUid: decoded.uid,
        status: 'active',
      });
      if (membership) {
        req.membership = membership;
        const provider = await Provider.findById(membership.providerId);
        if (provider) {
          req.provider = provider;
        }
      }
    }
  } catch {
    // Gracefully ignore invalid tokens in optional auth
  }
  next();
};

/**
 * Resolves the authenticated user's organization from MongoDB.
 * Never trusts a providerId supplied by the client; derives identity strictly from server records.
 */
export const requireProvider = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required before resolving provider context');
    return;
  }

  if (!isDatabaseConnected()) {
    sendError(
      res,
      503,
      'DATABASE_UNAVAILABLE',
      'MongoDB database is currently not connected. Provider operations require a working database.'
    );
    return;
  }

  try {
    // 1. Look up active membership for this user
    const membership = await UserMembership.findOne({
      firebaseUid: req.user.uid,
      status: 'active',
    });

    if (!membership) {
      sendError(
        res,
        403,
        'NO_PROVIDER_MEMBERSHIP',
        'Your user account is not associated with any registered payment provider organization. Please submit a provider registration first.'
      );
      return;
    }

    // 2. Fetch the provider organization document
    const provider = await Provider.findById(membership.providerId);
    if (!provider) {
      sendError(
        res,
        404,
        'PROVIDER_NOT_FOUND',
        'The provider organization associated with your membership could not be found.'
      );
      return;
    }

    req.membership = membership;
    req.provider = provider;
    next();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sendError(res, 500, 'MEMBERSHIP_RESOLUTION_ERROR', `Failed to resolve provider membership: ${msg}`);
  }
};

/**
 * Enforces that the authenticated provider's status is 'APPROVED'.
 * Rejects requests from pending, suspended, or rejected providers with specific HTTP 403 envelopes.
 */
export const requireProviderApproval = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.provider) {
    sendError(res, 403, 'NO_PROVIDER_CONTEXT', 'Provider context missing');
    return;
  }

  switch (req.provider.status) {
    case 'APPROVED':
      next();
      break;

    case 'PENDING_APPROVAL':
      sendError(
        res,
        403,
        'PROVIDER_PENDING_APPROVAL',
        `Provider organization '${req.provider.organisationName}' is pending administrative review. Dataset uploads and restricted analytics are locked until approval.`,
        { status: req.provider.status }
      );
      break;

    case 'SUSPENDED':
      sendError(
        res,
        403,
        'PROVIDER_SUSPENDED',
        `Provider organization '${req.provider.organisationName}' has been suspended. Please contact platform compliance support.`,
        { status: req.provider.status }
      );
      break;

    case 'REJECTED':
      sendError(
        res,
        403,
        'PROVIDER_REJECTED',
        `Provider organization application was rejected: ${req.provider.rejectionReason || 'Does not meet onboarding criteria.'}`,
        { status: req.provider.status, reason: req.provider.rejectionReason }
      );
      break;

    case 'REQUIRES_MORE_INFORMATION':
      sendError(
        res,
        403,
        'PROVIDER_REQUIRES_INFO',
        `Additional compliance verification required: ${req.provider.reviewNotes || 'Please update your verification documents.'}`,
        { status: req.provider.status }
      );
      break;

    default:
      sendError(res, 403, 'PROVIDER_NOT_AUTHORIZED', 'Provider organization is not currently active');
  }
};

/**
 * Enforces specific organization membership roles (e.g. 'owner', 'analyst', 'admin').
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Check if user is platform admin first
    if (req.user?.role === 'admin' || req.user?.claims?.admin === true) {
      return next();
    }

    // 2. Check provider membership role
    const memberRole = req.membership?.role;
    if (!memberRole || !allowedRoles.includes(memberRole)) {
      sendError(
        res,
        403,
        'FORBIDDEN_ROLE',
        `Operation requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: '${memberRole || 'none'}'.`,
        { requiredRoles: allowedRoles, currentRole: memberRole }
      );
      return;
    }

    next();
  };
};

/**
 * Enforces that the request is made by a verified Platform Administrator.
 */
export const requirePlatformAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  const isAdmin =
    req.user.role === 'admin' ||
    req.user.claims?.admin === true ||
    req.membership?.role === 'admin';

  if (!isAdmin) {
    sendError(
      res,
      403,
      'PLATFORM_ADMIN_REQUIRED',
      'Access denied. This endpoint is restricted to platform administrators.'
    );
    return;
  }

  next();
};
