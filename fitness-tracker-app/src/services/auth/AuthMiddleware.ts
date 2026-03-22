import { supabase } from '../../config/supabase';
import authService from './AuthService';

/**
 * Authentication error types
 */
export enum AuthErrorType {
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

/**
 * Authentication error class
 */
export class AuthError extends Error {
  constructor(
    public type: AuthErrorType,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * AuthMiddleware handles authentication context and token management
 * for all Supabase requests
 */
class AuthMiddleware {
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

  /**
   * Initialize the auth middleware
   * Sets up automatic token refresh and error handling
   */
  initialize(): void {
    // Supabase client automatically handles token refresh
    // We just need to ensure the session is properly maintained
    this.setupSessionMonitoring();
  }

  /**
   * Setup session monitoring to detect token expiration
   */
  private setupSessionMonitoring(): void {
    // Check session validity periodically
    setInterval(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          return;
        }

        if (!session) {
          // No active session - user needs to sign in
          return;
        }

        // Check if token is about to expire (within 5 minutes)
        const expiresAt = session.expires_at;
        if (expiresAt) {
          const expiresIn = expiresAt - Math.floor(Date.now() / 1000);
          if (expiresIn < 300) {
            // Token expires in less than 5 minutes, refresh it
            await this.refreshToken();
          }
        }
      } catch (error) {
        console.error('Session monitoring error:', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Refresh the authentication token
   * Ensures only one refresh happens at a time
   */
  async refreshToken(): Promise<string> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._performRefresh();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async _performRefresh(): Promise<string> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        throw new AuthError(
          AuthErrorType.TOKEN_EXPIRED,
          'Failed to refresh token',
          error
        );
      }

      if (!data.session) {
        throw new AuthError(
          AuthErrorType.INVALID_TOKEN,
          'No session returned from refresh'
        );
      }

      return data.session.access_token;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Network error during token refresh',
        error
      );
    }
  }

  /**
   * Handle authentication errors from Supabase operations
   * @param error The error from Supabase
   * @returns AuthError with appropriate type
   */
  handleAuthError(error: any): AuthError {
    // Check for specific Supabase error codes
    if (error?.code === 'PGRST301') {
      // JWT expired
      return new AuthError(
        AuthErrorType.TOKEN_EXPIRED,
        'Authentication token has expired',
        error
      );
    }

    if (error?.code === 'PGRST302') {
      // JWT invalid
      return new AuthError(
        AuthErrorType.INVALID_TOKEN,
        'Authentication token is invalid',
        error
      );
    }

    if (error?.message?.includes('JWT')) {
      // Generic JWT error
      return new AuthError(
        AuthErrorType.INVALID_TOKEN,
        'Authentication token error',
        error
      );
    }

    if (error?.message?.includes('not authenticated')) {
      return new AuthError(
        AuthErrorType.UNAUTHORIZED,
        'User is not authenticated',
        error
      );
    }

    // Network or other errors
    return new AuthError(
      AuthErrorType.NETWORK_ERROR,
      error?.message || 'Unknown authentication error',
      error
    );
  }

  /**
   * Execute a Supabase operation with automatic retry on token expiration
   * @param operation The Supabase operation to execute
   * @param maxRetries Maximum number of retries (default: 1)
   */
  async executeWithRetry<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    maxRetries: number = 1
  ): Promise<{ data: T | null; error: any }> {
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();

        // Check if the error is auth-related
        if (result.error) {
          const authError = this.handleAuthError(result.error);

          // If token expired, try to refresh and retry
          if (
            authError.type === AuthErrorType.TOKEN_EXPIRED &&
            attempt < maxRetries
          ) {
            console.log('Token expired, refreshing and retrying...');
            await this.refreshToken();
            continue; // Retry the operation
          }

          // For other auth errors or if we've exhausted retries, return the error
          return { data: null, error: authError };
        }

        // Success
        return result;
      } catch (error) {
        lastError = error;
        console.error(`Operation attempt ${attempt + 1} failed:`, error);

        // If it's a network error and we have retries left, try again
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
      }
    }

    // All retries exhausted
    return {
      data: null,
      error: new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Operation failed after retries',
        lastError
      ),
    };
  }

  /**
   * Verify that the user is authenticated and has a valid session
   * @throws AuthError if not authenticated or session is invalid
   */
  async verifyAuthentication(): Promise<void> {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      throw this.handleAuthError(error);
    }

    if (!session) {
      throw new AuthError(
        AuthErrorType.UNAUTHORIZED,
        'No active session found'
      );
    }

    // Check if token is expired
    if (session.expires_at && session.expires_at < Math.floor(Date.now() / 1000)) {
      throw new AuthError(
        AuthErrorType.TOKEN_EXPIRED,
        'Session has expired'
      );
    }
  }

  /**
   * Get the current user's ID from the session
   * Used for RLS policies
   */
  async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.id || null;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }
}

const authMiddleware = new AuthMiddleware();
export default authMiddleware;
