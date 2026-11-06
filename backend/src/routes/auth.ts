import { Router, Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  verifyFirebaseToken,
  getUserProfile,
  revokeUserTokens,
  requestPasswordReset,
  getFirebaseStatus,
  isFirebaseConfigured,
  isWebApiKeyConfigured,
} from '../services/firebaseService.js';
import { requireAuth } from '../middleware/auth.js';
import { sendError } from '../lib/errors.js';
import { UserMembership } from '../models/UserMembership.js';
import { Provider } from '../models/Provider.js';
import { isDatabaseConnected } from '../config/database.js';

const router = Router();

/**
 * Format Firebase Auth error messages into developer-friendly strings.
 */
function friendlyAuthErrorMessage(rawMessage: string): { code: string; message: string; status: number } {
  const upper = rawMessage.toUpperCase();

  if (upper.includes('EMAIL_EXISTS') || upper.includes('EMAIL_ALREADY_EXISTS') || upper.includes('AUTH/EMAIL-ALREADY-EXISTS')) {
    return {
      code: 'EMAIL_ALREADY_IN_USE',
      message: 'An account with this email address already exists. Please log in instead.',
      status: 409,
    };
  }
  if (upper.includes('EMAIL_NOT_FOUND') || upper.includes('AUTH/USER-NOT-FOUND')) {
    return {
      code: 'USER_NOT_FOUND',
      message: 'No registered user found with this email address.',
      status: 404,
    };
  }
  if (upper.includes('INVALID_PASSWORD') || upper.includes('AUTH/WRONG-PASSWORD') || upper.includes('INVALID_LOGIN_CREDENTIALS')) {
    return {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
      status: 401,
    };
  }
  if (upper.includes('USER_DISABLED') || upper.includes('AUTH/USER-DISABLED')) {
    return {
      code: 'ACCOUNT_DISABLED',
      message: 'This user account has been disabled. Please contact an administrator.',
      status: 403,
    };
  }
  if (upper.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
    return {
      code: 'RATE_LIMITED',
      message: 'Access temporarily disabled due to many failed login attempts. Try again later or reset your password.',
      status: 429,
    };
  }
  if (upper.includes('OPERATION_NOT_ALLOWED')) {
    return {
      code: 'AUTH_METHOD_DISABLED',
      message: 'Email/Password sign-in provider is disabled in Firebase Console (Authentication > Sign-in method).',
      status: 403,
    };
  }
  if (upper.includes('WEAK_PASSWORD') || upper.includes('PASSWORD_DOES_NOT_MEET_REQUIREMENTS')) {
    return {
      code: 'WEAK_PASSWORD',
      message: 'Password must be at least 6 characters long.',
      status: 400,
    };
  }
  if (upper.includes('INVALID_ID_TOKEN') || upper.includes('TOKEN_EXPIRED')) {
    return {
      code: 'INVALID_TOKEN',
      message: 'The authentication token has expired or is invalid.',
      status: 401,
    };
  }
  if (upper.includes('CONFIGURATION_NOT_FOUND')) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.projectId || 'aegispay-21274';
    return {
      code: 'FIREBASE_AUTH_NOT_INITIALIZED',
      message: `Firebase Authentication is not yet enabled for project "${projectId}". In Firebase Console (https://console.firebase.google.com/project/${projectId}/authentication), click "Get started" and enable "Email/Password" under the Sign-in method tab.`,
      status: 400,
    };
  }

  return {
    code: 'AUTH_ERROR',
    message: rawMessage,
    status: 400,
  };
}

/**
 * GET /api/auth/status
 * Public endpoint to inspect Firebase auth status and environment configuration.
 */
router.get('/status', (_req: Request, res: Response) => {
  const status = getFirebaseStatus();
  res.json({
    success: true,
    data: status,
    instructions: status.configured
      ? 'Firebase Authentication is configured and ready.'
      : 'Firebase credentials missing or using placeholders. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY (and FIREBASE_WEB_API_KEY) in .env.',
  });
});

/**
 * POST /api/auth/register
 * Register a new user account.
 * Body: { email, password, displayName?, role?, phoneNumber? }
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName, role, phoneNumber } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      sendError(res, 400, 'INVALID_EMAIL', 'A valid email address is required');
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      sendError(res, 400, 'WEAK_PASSWORD', 'Password must be at least 6 characters long');
      return;
    }

    const validRoles = ['analyst', 'investigator', 'admin', 'compliance_officer'];
    const chosenRole = role && validRoles.includes(role) ? role : 'analyst';

    const result = await registerUser({
      email: email.trim(),
      password,
      displayName: displayName?.trim(),
      role: chosenRole,
      phoneNumber: phoneNumber?.trim(),
    });

    res.status(201).json(result);
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Registration failed';
    const friendly = friendlyAuthErrorMessage(rawMsg);
    sendError(res, friendly.status, friendly.code, friendly.message);
  }
});

/**
 * POST /api/auth/login
 * Sign in using email/password or by validating a client Firebase ID token.
 * Body: { email, password } OR { idToken }
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, idToken } = req.body;

    // Check if neither credentials nor token is passed
    if (!idToken && (!email || !password)) {
      sendError(
        res,
        400,
        'MISSING_CREDENTIALS',
        'Please provide both email and password, or pass a client idToken'
      );
      return;
    }

    const result = await loginUser({
      email: email ? String(email).trim() : undefined,
      password: password ? String(password) : undefined,
      idToken: idToken ? String(idToken).trim() : undefined,
    });

    res.json(result);
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Login failed';
    const friendly = friendlyAuthErrorMessage(rawMsg);
    sendError(res, friendly.status, friendly.code, friendly.message);
  }
});

/**
 * POST /api/auth/verify
 * Validate an existing Firebase ID Token.
 * Body: { idToken } or Authorization header
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const headerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.substring(7).trim()
      : null;
    const token = req.body?.idToken || headerToken;

    if (!token) {
      sendError(res, 400, 'MISSING_TOKEN', 'Please provide idToken in body or Authorization header');
      return;
    }

    const decoded = await verifyFirebaseToken(token);
    res.json({
      success: true,
      valid: true,
      user: {
        uid: decoded.uid,
        email: decoded.email,
        displayName: decoded.name,
        role: decoded.role || 'analyst',
        emailVerified: decoded.email_verified,
        authTime: decoded.auth_time,
        exp: decoded.exp,
      },
    });
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Token verification failed';
    const friendly = friendlyAuthErrorMessage(rawMsg);
    sendError(res, friendly.status, friendly.code, friendly.message);
  }
});

/**
 * GET /api/auth/me
 * Get currently authenticated user details.
 * Requires: Authorization: Bearer <idToken>
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const uid = req.user!.uid;
    let organizationMembership: Record<string, unknown> | null = null;

    if (isDatabaseConnected()) {
      try {
        const membership = await UserMembership.findOne({
          firebaseUid: uid,
          status: 'active',
        });
        if (membership) {
          const provider = await Provider.findById(membership.providerId);
          organizationMembership = {
            membershipId: membership._id,
            role: membership.role,
            permissions: membership.permissions,
            status: membership.status,
            provider: provider
              ? {
                  id: provider._id,
                  organisationName: provider.organisationName,
                  status: provider.status,
                  officialEmail: provider.officialEmail,
                }
              : null,
          };
        }
      } catch (dbErr) {
        console.warn('[Auth Me] Failed to resolve membership:', dbErr);
      }
    }

    if (isFirebaseConfigured()) {
      try {
        const fullRecord = await getUserProfile(uid);
        res.json({
          success: true,
          user: {
            uid: fullRecord.uid,
            email: fullRecord.email,
            displayName: fullRecord.displayName,
            role: (fullRecord.customClaims?.role as string) || req.user!.role,
            emailVerified: fullRecord.emailVerified,
            disabled: fullRecord.disabled,
            phoneNumber: fullRecord.phoneNumber,
            metadata: fullRecord.metadata,
            customClaims: fullRecord.customClaims || {},
            organization: organizationMembership,
          },
        });
        return;
      } catch {
        // Fallback to token claims
      }
    }

    res.json({
      success: true,
      user: {
        ...req.user,
        organization: organizationMembership,
      },
    });
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Failed to retrieve profile';
    sendError(res, 500, 'PROFILE_FETCH_FAILED', rawMsg);
  }
});

/**
 * POST /api/auth/logout
 * Revoke active refresh tokens for the authenticated user.
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    let uid = req.body?.uid;

    if (!uid && req.headers.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.substring(7).trim();
      try {
        const decoded = await verifyFirebaseToken(token);
        uid = decoded.uid;
      } catch {
        // Continue even if token is already expired
      }
    }

    if (uid && isFirebaseConfigured()) {
      await revokeUserTokens(uid);
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Logout failed';
    sendError(res, 500, 'LOGOUT_FAILED', rawMsg);
  }
});

/**
 * POST /api/auth/forgot-password
 * Send password reset email or retrieve a reset link.
 * Body: { email }
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      sendError(res, 400, 'INVALID_EMAIL', 'A valid email address is required');
      return;
    }

    const result = await requestPasswordReset(email.trim());
    res.json({
      success: true,
      message: result.sent
        ? 'Password reset email dispatched successfully.'
        : 'Password reset link generated.',
      data: result,
    });
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Password reset failed';
    const friendly = friendlyAuthErrorMessage(rawMsg);
    sendError(res, friendly.status, friendly.code, friendly.message);
  }
});

export default router;
