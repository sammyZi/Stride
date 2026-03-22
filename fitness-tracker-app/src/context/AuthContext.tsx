import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService, { User, AuthResult } from '../services/auth/AuthService';

/**
 * Authentication context state
 */
interface AuthContextState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithGoogle: (idToken: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<string>;
}

/**
 * Authentication context
 */
const AuthContext = createContext<AuthContextState | undefined>(undefined);

/**
 * AuthProvider props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider component
 * Manages authentication state and provides auth methods to the app
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen to auth state changes
    const unsubscribe = authService.onAuthStateChanged((updatedUser) => {
      setUser(updatedUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Sign in with Google OAuth
   */
  const signInWithGoogle = async (idToken: string): Promise<AuthResult> => {
    try {
      const result = await authService.signInWithGoogle(idToken);
      setUser(result.user);
      return result;
    } catch (error) {
      console.error('Sign-in error:', error);
      throw error;
    }
  };

  /**
   * Sign out the current user
   */
  const signOut = async (): Promise<void> => {
    try {
      await authService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  };

  /**
   * Refresh the authentication token
   */
  const refreshToken = async (): Promise<string> => {
    try {
      return await authService.refreshToken();
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  };

  const value: AuthContextState = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signInWithGoogle,
    signOut,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * useAuth hook
 * Access authentication state and methods
 */
export const useAuth = (): AuthContextState => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
