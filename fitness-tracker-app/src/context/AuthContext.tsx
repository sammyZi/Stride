/**
 * Auth Context
 * Provides global access to authentication state across the app.
 *
 * Responsibilities:
 *  - Expose signUp / signIn / signOut actions
 *  - Restore persisted sessions on mount
 *  - Track loading states during auth operations
 *
 * Requirements: 1.1, 2.1, 3.1, 7.2, 7.5
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { AuthService } from '../services/auth';
import type { AuthUser, AuthSession, AuthResult } from '../types/auth';

// ── Context value interface ──────────────────────────────────────────────────

export interface AuthContextValue {
  /** The currently authenticated user, or null. */
  user: AuthUser | null;
  /** The active session, or null. */
  session: AuthSession | null;
  /** Whether a user is currently authenticated. */
  isAuthenticated: boolean;
  /** True while the initial session restore is in progress. */
  isLoading: boolean;

  /** Create a new account. */
  signUp: (email: string, password: string) => Promise<AuthResult>;
  /** Log in with existing credentials. */
  signIn: (email: string, password: string) => Promise<AuthResult>;
  /** Log out and clear session. */
  signOut: () => Promise<void>;
}

// ── Singleton AuthService instance ──────────────────────────────────────────

const authService = new AuthService();

// ── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Session restoration on mount ────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        const restoredSession = await authService.restoreSession();
        if (!cancelled) {
          if (restoredSession) {
            setUser(restoredSession.user);
            setSession(restoredSession);
          } else {
            setUser(null);
            setSession(null);
          }
        }
      } catch {
        // Graceful degradation — stay unauthenticated
        if (!cancelled) {
          setUser(null);
          setSession(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    restore();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const result = await authService.signUp(email, password);
    if (result.success && result.user && result.session) {
      setUser(result.user);
      setSession(result.session);
    }
    return result;
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const result = await authService.signIn(email, password);
    if (result.success && result.user && result.session) {
      setUser(result.user);
      setSession(result.session);
    }
    return result;
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await authService.signOut();
    setUser(null);
    setSession(null);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: user !== null && session !== null,
        isLoading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
