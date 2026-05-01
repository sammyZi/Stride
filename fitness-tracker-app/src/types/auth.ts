/**
 * Authentication type definitions for Supabase integration.
 * Follows the design document's AuthService interface specification.
 */

/** Represents an authenticated user. */
export interface AuthUser {
  id: string;
  email: string;
  createdAt: number;
}

/** Represents an active authentication session. */
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

/** Error codes returned by the AuthService. */
export type AuthErrorCode =
  | 'AUTH_INVALID_EMAIL'
  | 'AUTH_EMAIL_EXISTS'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_WEAK_PASSWORD'
  | 'AUTH_SESSION_EXPIRED'
  | 'AUTH_NETWORK_ERROR'
  | 'AUTH_SERVICE_UNAVAILABLE'
  | 'AUTH_UNKNOWN_ERROR';

/** Structured error from the AuthService. */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

/** Result of a signup or login operation. */
export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  error?: AuthError;
  /** True when signup succeeded but user must confirm their email before logging in. */
  emailConfirmationRequired?: boolean;
}

/** Interface for the AuthService. */
export interface IAuthService {
  // Authentication operations
  signUp(email: string, password: string): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;

  // Session management
  getSession(): Promise<AuthSession | null>;
  restoreSession(): Promise<AuthSession | null>;

  // State
  isAuthenticated(): boolean;
  getCurrentUser(): AuthUser | null;
}
