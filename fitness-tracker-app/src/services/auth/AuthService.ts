/**
 * AuthService — manages Supabase authentication operations.
 *
 * Responsibilities:
 *  - Email/password signup with validation
 *  - Email/password login
 *  - Session persistence & restoration via AsyncStorage
 *  - Logout with full token cleanup
 *
 * Requirements covered: 1.1–1.6, 2.1–2.5, 3.1–3.4, 7.1–7.5
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import {
  AuthUser,
  AuthSession,
  AuthResult,
  AuthError,
  AuthErrorCode,
  IAuthService,
} from '../../types/auth';

// ── Constants ────────────────────────────────────────────────────────────────

const AUTH_SESSION_KEY = '@auth_session';
const MIN_PASSWORD_LENGTH = 6;

/**
 * Lightweight email regex — covers the vast majority of valid addresses
 * without being overly permissive.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Map a Supabase error message to a typed AuthError. */
function mapSupabaseError(message: string): AuthError {
  const lower = message.toLowerCase();

  if (lower.includes('already registered') || lower.includes('already been registered') || lower.includes('user already registered')) {
    return {
      code: 'AUTH_EMAIL_EXISTS',
      message: 'An account with this email already exists',
    };
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return {
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    };
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return {
      code: 'AUTH_NETWORK_ERROR',
      message: 'Unable to connect. Please check your internet connection',
    };
  }
  if (lower.includes('service_unavailable') || lower.includes('service unavailable') || lower.includes('503')) {
    return {
      code: 'AUTH_SERVICE_UNAVAILABLE',
      message: 'Authentication service is temporarily unavailable. You can continue using the app in local-only mode',
    };
  }

  return {
    code: 'AUTH_UNKNOWN_ERROR',
    message: 'An unexpected error occurred. Please try again',
  };
}

/** Convert a Supabase user & session into our domain types. */
function toAuthUser(supabaseUser: { id: string; email?: string; created_at?: string }): AuthUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    createdAt: supabaseUser.created_at
      ? new Date(supabaseUser.created_at).getTime()
      : Date.now(),
  };
}

function toAuthSession(
  supabaseSession: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    user: { id: string; email?: string; created_at?: string };
  },
): AuthSession {
  return {
    accessToken: supabaseSession.access_token,
    refreshToken: supabaseSession.refresh_token,
    expiresAt: supabaseSession.expires_at
      ? supabaseSession.expires_at * 1000  // Supabase uses seconds, we use ms
      : Date.now() + 3600 * 1000,
    user: toAuthUser(supabaseSession.user),
  };
}

// ── AuthService Implementation ──────────────────────────────────────────────

export class AuthService implements IAuthService {
  private _currentUser: AuthUser | null = null;
  private _currentSession: AuthSession | null = null;

  // ── Signup ──────────────────────────────────────────────────────────────

  /**
   * Create a new account with email & password.
   *
   * Validates email format and password length before reaching Supabase.
   * On success the user is automatically authenticated.
   */
  async signUp(email: string, password: string): Promise<AuthResult> {
    // Client-side validation
    const validationError = this.validateCredentials(email, password);
    if (validationError) {
      return { success: false, error: validationError };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { success: false, error: mapSupabaseError(error.message) };
      }

      if (!data.user || !data.session) {
        return {
          success: false,
          error: {
            code: 'AUTH_UNKNOWN_ERROR',
            message: 'Signup succeeded but no session was created',
          },
        };
      }

      const user = toAuthUser(data.user);
      const session = toAuthSession(data.session);

      // Persist & cache
      await this.persistSession(session);
      this._currentUser = user;
      this._currentSession = session;

      return { success: true, user, session };
    } catch (err: any) {
      return { success: false, error: mapSupabaseError(err?.message ?? 'Unknown error') };
    }
  }

  // ── Login ───────────────────────────────────────────────────────────────

  /**
   * Authenticate an existing user.
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    // Client-side validation
    const validationError = this.validateCredentials(email, password);
    if (validationError) {
      return { success: false, error: validationError };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: mapSupabaseError(error.message) };
      }

      if (!data.user || !data.session) {
        return {
          success: false,
          error: {
            code: 'AUTH_INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        };
      }

      const user = toAuthUser(data.user);
      const session = toAuthSession(data.session);

      await this.persistSession(session);
      this._currentUser = user;
      this._currentSession = session;

      return { success: true, user, session };
    } catch (err: any) {
      return { success: false, error: mapSupabaseError(err?.message ?? 'Unknown error') };
    }
  }

  // ── Session Management ──────────────────────────────────────────────────

  /**
   * Return the current in-memory session, or null if unauthenticated.
   */
  async getSession(): Promise<AuthSession | null> {
    if (this._currentSession) {
      // Check expiration
      if (this._currentSession.expiresAt <= Date.now()) {
        // Session expired — clear and return null
        await this.clearSession();
        return null;
      }
      return this._currentSession;
    }
    return null;
  }

  /**
   * Attempt to restore a persisted session from AsyncStorage and
   * validate it against Supabase.
   */
  async restoreSession(): Promise<AuthSession | null> {
    try {
      // First try to restore from Supabase client (which uses AsyncStorage internally)
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        // Fallback: try our own persisted copy
        const stored = await AsyncStorage.getItem(AUTH_SESSION_KEY);
        if (!stored) {
          await this.clearSession();
          return null;
        }

        const parsed: AuthSession = JSON.parse(stored);

        // Check expiration
        if (parsed.expiresAt <= Date.now()) {
          await this.clearSession();
          return null;
        }

        // Cache it
        this._currentUser = parsed.user;
        this._currentSession = parsed;
        return parsed;
      }

      const session = toAuthSession(data.session);
      await this.persistSession(session);
      this._currentUser = session.user;
      this._currentSession = session;
      return session;
    } catch {
      // Network unavailable — try local copy for offline support (Req 7.4)
      try {
        const stored = await AsyncStorage.getItem(AUTH_SESSION_KEY);
        if (stored) {
          const parsed: AuthSession = JSON.parse(stored);
          if (parsed.expiresAt > Date.now()) {
            this._currentUser = parsed.user;
            this._currentSession = parsed;
            return parsed;
          }
        }
      } catch {
        // Ignore nested failures
      }
      await this.clearSession();
      return null;
    }
  }

  // ── Logout ──────────────────────────────────────────────────────────────

  /**
   * Sign out the current user — clears Supabase session and all local tokens.
   */
  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch {
      // Best-effort — always clear local state even if Supabase call fails.
    }
    await this.clearSession();
  }

  // ── State Accessors ────────────────────────────────────────────────────

  isAuthenticated(): boolean {
    return this._currentUser !== null && this._currentSession !== null;
  }

  getCurrentUser(): AuthUser | null {
    return this._currentUser;
  }

  // ── Private Helpers ────────────────────────────────────────────────────

  /**
   * Validate email format and password length.
   * Returns an AuthError if invalid, or null if everything looks good.
   */
  private validateCredentials(email: string, password: string): AuthError | null {
    if (!email || !EMAIL_REGEX.test(email)) {
      return {
        code: 'AUTH_INVALID_EMAIL',
        message: 'Please enter a valid email address',
      };
    }
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return {
        code: 'AUTH_WEAK_PASSWORD',
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      };
    }
    return null;
  }

  /** Persist session to AsyncStorage. */
  private async persistSession(session: AuthSession): Promise<void> {
    await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  }

  /** Clear all auth state — both in-memory and persisted. */
  private async clearSession(): Promise<void> {
    this._currentUser = null;
    this._currentSession = null;
    await AsyncStorage.removeItem(AUTH_SESSION_KEY);
  }
}
