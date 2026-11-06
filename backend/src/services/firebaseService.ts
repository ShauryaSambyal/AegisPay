import { initializeApp, cert, getApps, getApp, App } from 'firebase-admin/app';
import { getAuth, Auth, DecodedIdToken, UserRecord } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let firebaseApp: App | null = null;
let firebaseAuth: Auth | null = null;
let initAttempted = false;
let initError: string | null = null;

export interface FirebaseStatus {
  configured: boolean;
  adminSdkReady: boolean;
  webApiKeyConfigured: boolean;
  projectId?: string;
  authDomain?: string;
  error?: string | null;
  features: {
    registration: boolean;
    emailPasswordLogin: boolean;
    tokenVerification: boolean;
    customTokens: boolean;
  };
}

export interface RegisterUserInput {
  email: string;
  password?: string;
  displayName?: string;
  role?: string;
  phoneNumber?: string;
}

export interface LoginUserInput {
  email?: string;
  password?: string;
  idToken?: string;
}

export interface AuthSuccessResult {
  success: true;
  user: {
    uid: string;
    email?: string;
    displayName?: string;
    role: string;
    emailVerified: boolean;
    phoneNumber?: string;
    createdAt?: string;
  };
  tokens?: {
    idToken?: string;
    refreshToken?: string;
    customToken?: string;
    expiresIn?: number;
  };
}

export interface UnifiedUserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  role: string;
  emailVerified: boolean;
  phoneNumber?: string;
  disabled?: boolean;
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
  customClaims?: Record<string, unknown>;
}

/**
 * Normalizes a private key string, resolving escaped newlines and trimming quotes.
 */
function normalizePrivateKey(key: string): string {
  let cleaned = key.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.replace(/\\n/g, '\n');
}

/**
 * Checks if a string value is an unfilled placeholder or empty.
 */
function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const lower = value.trim().toLowerCase();
  return (
    lower === '' ||
    lower.includes('your_') ||
    lower.includes('insert_') ||
    lower.includes('placeholder') ||
    lower.includes('example.com')
  );
}

/**
 * Resolves the Firebase Web API Key across canonical and legacy aliases.
 */
export function getWebApiKey(): string | undefined {
  const raw =
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    process.env.apiKey;
  const trimmed = raw?.trim();
  return trimmed && !isPlaceholder(trimmed) ? trimmed : undefined;
}

/**
 * Resolves the Firebase Project ID across canonical and legacy aliases.
 */
export function getFirebaseProjectId(): string | undefined {
  const raw =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.projectId ||
    process.env.GCLOUD_PROJECT;
  const trimmed = raw?.trim();
  return trimmed && !isPlaceholder(trimmed) ? trimmed : undefined;
}

/**
 * Resolves the Firebase Auth Domain across canonical and legacy aliases.
 */
export function getAuthDomain(): string | undefined {
  const raw = process.env.FIREBASE_AUTH_DOMAIN || process.env.authDomain;
  const trimmed = raw?.trim();
  return trimmed && !isPlaceholder(trimmed) ? trimmed : undefined;
}

/**
 * Resolves Firebase service account credentials from supported environment options.
 */
function resolveCredentials() {
  // Option 1: Direct JSON string in FIREBASE_SERVICE_ACCOUNT_KEY
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (rawJson && !isPlaceholder(rawJson)) {
    try {
      const decoded = rawJson.startsWith('{')
        ? rawJson
        : Buffer.from(rawJson, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      return {
        credential: cert(parsed),
        projectId: parsed.project_id || getFirebaseProjectId(),
      };
    } catch (err) {
      console.warn('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', err);
    }
  }

  // Option 2: Path to JSON service account file
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (keyPath && !isPlaceholder(keyPath)) {
    const resolvedPath = path.isAbsolute(keyPath)
      ? keyPath
      : path.resolve(process.cwd(), keyPath);
    if (fs.existsSync(resolvedPath)) {
      try {
        const fileContent = fs.readFileSync(resolvedPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        return {
          credential: cert(parsed),
          projectId: parsed.project_id || getFirebaseProjectId(),
        };
      } catch (err) {
        console.warn(`[Firebase] Failed to read credentials from ${resolvedPath}:`, err);
      }
    } else {
      console.warn(`[Firebase] Service account file not found at: ${resolvedPath}`);
    }
  }

  // Option 3: Individual environment variables
  const projectId = getFirebaseProjectId();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY?.trim();

  if (
    projectId &&
    !isPlaceholder(projectId) &&
    clientEmail &&
    !isPlaceholder(clientEmail) &&
    privateKeyRaw &&
    !isPlaceholder(privateKeyRaw)
  ) {
    const privateKey = normalizePrivateKey(privateKeyRaw);
    return {
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    };
  }

  // Option 4: Standard Google Application Default Credentials
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return {
      credential: undefined,
      projectId: getFirebaseProjectId(),
    };
  }

  return null;
}

/**
 * Initializes Firebase Admin SDK if service account credentials are provided.
 * Does NOT throw if service account is not yet configured; returns null instead.
 */
export function getFirebaseAdmin(): { app: App; auth: Auth } | null {
  if (firebaseApp && firebaseAuth) {
    return { app: firebaseApp, auth: firebaseAuth };
  }

  if (getApps().length > 0) {
    firebaseApp = getApp();
    firebaseAuth = getAuth(firebaseApp);
    return { app: firebaseApp, auth: firebaseAuth };
  }

  if (initAttempted && initError) {
    return null;
  }

  initAttempted = true;

  try {
    const creds = resolveCredentials();
    if (!creds) {
      initError =
        'Firebase Service Account credentials not provided. REST authentication fallback is active.';
      return null;
    }

    firebaseApp = creds.credential
      ? initializeApp({ credential: creds.credential, projectId: creds.projectId })
      : initializeApp({ projectId: creds.projectId });

    firebaseAuth = getAuth(firebaseApp);
    initError = null;
    console.log(`[Firebase] Admin SDK initialized successfully for project: ${creds.projectId || 'default'}`);
    return { app: firebaseApp, auth: firebaseAuth };
  } catch (err) {
    initError = err instanceof Error ? err.message : String(err);
    console.error('[Firebase] Failed to initialize Firebase Admin SDK:', initError);
    return null;
  }
}

/**
 * Whether the Firebase Admin SDK is successfully initialized with a service account.
 */
export function isAdminSdkReady(): boolean {
  return getFirebaseAdmin() !== null;
}

/**
 * Whether the Firebase Web API Key is present in the environment.
 */
export function isWebApiKeyConfigured(): boolean {
  return Boolean(getWebApiKey());
}

/**
 * Whether Firebase is configured via either Admin SDK or Web API Key.
 */
export function isFirebaseConfigured(): boolean {
  return isAdminSdkReady() || isWebApiKeyConfigured();
}

/**
 * Get comprehensive Firebase system status.
 */
export function getFirebaseStatus(): FirebaseStatus {
  const admin = getFirebaseAdmin();
  const webApiOk = isWebApiKeyConfigured();
  const configured = admin !== null || webApiOk;
  const projectId = getFirebaseProjectId();

  return {
    configured,
    adminSdkReady: admin !== null,
    webApiKeyConfigured: webApiOk,
    projectId,
    authDomain: getAuthDomain(),
    error: !configured ? initError : null,
    features: {
      registration: configured,
      emailPasswordLogin: webApiOk,
      tokenVerification: configured,
      customTokens: admin !== null,
    },
  };
}

/**
 * Verify a Firebase ID token.
 * Uses Firebase Admin SDK when available, and falls back to Google Identity Toolkit REST API.
 */
export async function verifyFirebaseToken(idToken: string): Promise<DecodedIdToken> {
  const admin = getFirebaseAdmin();
  if (admin) {
    try {
      return await admin.auth.verifyIdToken(idToken, true);
    } catch (adminErr) {
      // Fallback to REST lookup if admin verify throws
      if (!isWebApiKeyConfigured()) throw adminErr;
    }
  }

  const apiKey = getWebApiKey();
  if (apiKey) {
    const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    const data = (await response.json()) as any;
    if (!response.ok || !data.users || data.users.length === 0) {
      const errorMsg = data?.error?.message || 'Invalid or expired ID token';
      throw new Error(errorMsg);
    }

    const u = data.users[0];
    let customClaims: Record<string, unknown> = {};
    if (u.customAttributes) {
      try {
        customClaims = JSON.parse(u.customAttributes);
      } catch {
        // ignore
      }
    }

    const projectId = getFirebaseProjectId() || 'aegispay-21274';
    return {
      uid: u.localId,
      sub: u.localId,
      email: u.email,
      email_verified: Boolean(u.emailVerified),
      name: u.displayName,
      auth_time: Math.floor(Number(u.lastLoginAt || Date.now()) / 1000),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: projectId,
      iss: `https://securetoken.google.com/${projectId}`,
      role: (customClaims.role as string) || 'analyst',
      firebase: {
        identities: {},
        sign_in_provider: 'password',
      },
      ...customClaims,
    } as DecodedIdToken;
  }

  throw new Error('Firebase Authentication is not configured. Please supply Firebase credentials in .env');
}

/**
 * Sign in using Firebase Identity Toolkit REST API with email & password.
 */
async function signInWithRestApi(email: string, password: string): Promise<{
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  localId: string;
  email: string;
  displayName?: string;
}> {
  const apiKey = getWebApiKey();
  if (!apiKey) {
    throw new Error(
      'FIREBASE_WEB_API_KEY is not configured in .env. It is required for backend email/password sign-in.'
    );
  }

  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });

  const data = (await response.json()) as any;

  if (!response.ok) {
    const errorMsg = data?.error?.message || 'Authentication failed';
    throw new Error(errorMsg);
  }

  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresIn: Number(data.expiresIn) || 3600,
    localId: data.localId,
    email: data.email,
    displayName: data.displayName,
  };
}

/**
 * Sign up using Firebase Identity Toolkit REST API.
 */
async function signUpWithRestApi(email: string, password: string, displayName?: string): Promise<{
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  localId: string;
}> {
  const apiKey = getWebApiKey();
  if (!apiKey) {
    throw new Error(
      'FIREBASE_WEB_API_KEY is not configured in .env. It is required for direct REST registration.'
    );
  }

  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });

  const data = (await response.json()) as any;
  if (!response.ok) {
    const errorMsg = data?.error?.message || 'Registration failed';
    throw new Error(errorMsg);
  }

  if (displayName) {
    const updateEndpoint = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`;
    await fetch(updateEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: data.idToken,
        displayName,
        returnSecureToken: true,
      }),
    }).catch(() => {
      // Best-effort display name update
    });
  }

  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresIn: Number(data.expiresIn) || 3600,
    localId: data.localId,
  };
}

/**
 * Register a new user in Firebase Auth.
 * Uses Firebase Admin SDK when available to set custom user claims (roles).
 */
export async function registerUser(input: RegisterUserInput): Promise<AuthSuccessResult> {
  const { email, password, displayName, role = 'analyst', phoneNumber } = input;
  const admin = getFirebaseAdmin();

  if (!email || !email.includes('@')) {
    throw new Error('A valid email address is required');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  // Path A: Admin SDK is available (preferred)
  if (admin) {
    const userRecord = await admin.auth.createUser({
      email,
      password,
      displayName: displayName || undefined,
      phoneNumber: phoneNumber || undefined,
      emailVerified: false,
    });

    // Set custom role claims
    await admin.auth.setCustomUserClaims(userRecord.uid, { role });

    let tokens: AuthSuccessResult['tokens'] = {};

    // If Web API key is also available, log in immediately to return full tokens
    if (isWebApiKeyConfigured()) {
      try {
        const restResult = await signInWithRestApi(email, password);
        tokens = {
          idToken: restResult.idToken,
          refreshToken: restResult.refreshToken,
          expiresIn: restResult.expiresIn,
        };
      } catch {
        // Fallback to custom token if auto-sign-in fails
        const customToken = await admin.auth.createCustomToken(userRecord.uid, { role });
        tokens = { customToken };
      }
    } else {
      const customToken = await admin.auth.createCustomToken(userRecord.uid, { role });
      tokens = { customToken };
    }

    return {
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role,
        emailVerified: userRecord.emailVerified,
        phoneNumber: userRecord.phoneNumber,
        createdAt: userRecord.metadata.creationTime,
      },
      tokens,
    };
  }

  // Path B: Web API Key is available
  if (isWebApiKeyConfigured()) {
    const restResult = await signUpWithRestApi(email, password, displayName);
    return {
      success: true,
      user: {
        uid: restResult.localId,
        email,
        displayName: displayName || undefined,
        role,
        emailVerified: false,
        createdAt: new Date().toISOString(),
      },
      tokens: {
        idToken: restResult.idToken,
        refreshToken: restResult.refreshToken,
        expiresIn: restResult.expiresIn,
      },
    };
  }

  throw new Error(
    'Firebase Authentication is not configured. Please supply Firebase credentials or FIREBASE_WEB_API_KEY in .env'
  );
}

/**
 * Log in a user with email/password or by verifying an ID token.
 */
export async function loginUser(input: LoginUserInput): Promise<AuthSuccessResult> {
  const { email, password, idToken } = input;
  const admin = getFirebaseAdmin();

  // Mode 1: Client provided an ID Token from Firebase Client SDK / OAuth
  if (idToken) {
    const decoded = await verifyFirebaseToken(idToken);
    let role = (decoded.role as string) || 'analyst';
    let displayName = decoded.name;
    let phoneNumber = decoded.phone_number;
    let createdAt: string | undefined;

    if (admin) {
      try {
        const record = await admin.auth.getUser(decoded.uid);
        role = (record.customClaims?.role as string) || role;
        displayName = record.displayName || displayName;
        phoneNumber = record.phoneNumber || phoneNumber;
        createdAt = record.metadata.creationTime;
      } catch {
        // Continue with decoded token info
      }
    }

    return {
      success: true,
      user: {
        uid: decoded.uid,
        email: decoded.email,
        displayName,
        role,
        emailVerified: Boolean(decoded.email_verified),
        phoneNumber,
        createdAt,
      },
      tokens: {
        idToken,
      },
    };
  }

  // Mode 2: Client provided email and password
  if (!email || !password) {
    throw new Error('Please provide either an idToken or both email and password');
  }

  if (!isWebApiKeyConfigured()) {
    throw new Error(
      'FIREBASE_WEB_API_KEY is not set in .env. Direct email/password login requires FIREBASE_WEB_API_KEY from Firebase Console > Project Settings > General.'
    );
  }

  const restResult = await signInWithRestApi(email, password);
  let role = 'analyst';
  let emailVerified = false;
  let createdAt: string | undefined;

  if (admin) {
    try {
      const record = await admin.auth.getUser(restResult.localId);
      role = (record.customClaims?.role as string) || 'analyst';
      emailVerified = record.emailVerified;
      createdAt = record.metadata.creationTime;
    } catch {
      // Continue with default role
    }
  }

  return {
    success: true,
    user: {
      uid: restResult.localId,
      email: restResult.email,
      displayName: restResult.displayName,
      role,
      emailVerified,
      createdAt,
    },
    tokens: {
      idToken: restResult.idToken,
      refreshToken: restResult.refreshToken,
      expiresIn: restResult.expiresIn,
    },
  };
}

/**
 * Get user profile details by UID.
 */
export async function getUserProfile(uid: string): Promise<UnifiedUserProfile> {
  const admin = getFirebaseAdmin();
  if (admin) {
    const record = await admin.auth.getUser(uid);
    return {
      uid: record.uid,
      email: record.email,
      displayName: record.displayName,
      role: (record.customClaims?.role as string) || 'analyst',
      emailVerified: record.emailVerified,
      disabled: record.disabled,
      phoneNumber: record.phoneNumber,
      metadata: record.metadata,
      customClaims: record.customClaims || {},
    };
  }

  const apiKey = getWebApiKey();
  if (apiKey) {
    const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ localId: [uid] }),
    });

    const data = (await response.json()) as any;
    if (response.ok && data.users && data.users.length > 0) {
      const u = data.users[0];
      let customClaims: Record<string, unknown> = {};
      if (u.customAttributes) {
        try {
          customClaims = JSON.parse(u.customAttributes);
        } catch {
          // ignore
        }
      }
      return {
        uid: u.localId,
        email: u.email,
        displayName: u.displayName,
        emailVerified: Boolean(u.emailVerified),
        role: (customClaims.role as string) || 'analyst',
        metadata: {
          creationTime: u.createdAt,
          lastSignInTime: u.lastLoginAt,
        },
        customClaims,
      };
    }
  }

  throw new Error('Cannot retrieve user profile without Firebase Admin or Web API credentials');
}

/**
 * Revoke all refresh tokens for a user (forces re-login).
 */
export async function revokeUserTokens(uid: string): Promise<void> {
  const admin = getFirebaseAdmin();
  if (admin) {
    await admin.auth.revokeRefreshTokens(uid);
    return;
  }
}

/**
 * Trigger a password reset email or generate a password reset link.
 */
export async function requestPasswordReset(email: string): Promise<{ link?: string; sent: boolean }> {
  const apiKey = getWebApiKey();
  const admin = getFirebaseAdmin();

  if (apiKey) {
    const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as any;
      throw new Error(data?.error?.message || 'Password reset request failed');
    }
    return { sent: true };
  }

  if (admin) {
    const link = await admin.auth.generatePasswordResetLink(email);
    return { link, sent: false };
  }

  throw new Error('Neither FIREBASE_WEB_API_KEY nor Firebase Admin credentials are configured in .env');
}
