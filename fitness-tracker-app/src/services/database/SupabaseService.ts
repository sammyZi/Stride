import { supabase } from '../../config/supabase';
import authMiddleware, { AuthError, AuthErrorType } from '../auth/AuthMiddleware';

/**
 * Database operation result
 */
export interface DatabaseResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * SupabaseService provides a wrapper around Supabase operations
 * with automatic authentication handling and error recovery
 */
class SupabaseService {
  /**
   * Initialize the service
   */
  initialize(): void {
    authMiddleware.initialize();
  }

  /**
   * Execute a database query with automatic retry on auth errors
   * @param operation The database operation to execute
   * @param requireAuth Whether authentication is required (default: true)
   */
  async executeQuery<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    requireAuth: boolean = true
  ): Promise<DatabaseResult<T>> {
    try {
      // Verify authentication if required
      if (requireAuth) {
        await authMiddleware.verifyAuthentication();
      }

      // Execute with automatic retry on token expiration
      const result = await authMiddleware.executeWithRetry(operation);

      if (result.error) {
        // Convert to standard Error
        if (result.error instanceof AuthError) {
          return { data: null, error: result.error };
        }
        return {
          data: null,
          error: new Error(result.error.message || 'Database operation failed'),
        };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Database operation error:', error);
      
      if (error instanceof AuthError) {
        return { data: null, error };
      }

      return {
        data: null,
        error: new Error(
          error instanceof Error ? error.message : 'Unknown database error'
        ),
      };
    }
  }

  /**
   * Get the Supabase client instance
   * Use this for direct access when needed
   */
  getClient() {
    return supabase;
  }

  /**
   * Check if an error is an authentication error
   */
  isAuthError(error: any): boolean {
    return error instanceof AuthError;
  }

  /**
   * Check if an error requires re-authentication
   */
  requiresReauth(error: any): boolean {
    if (!(error instanceof AuthError)) {
      return false;
    }

    return (
      error.type === AuthErrorType.TOKEN_EXPIRED ||
      error.type === AuthErrorType.INVALID_TOKEN ||
      error.type === AuthErrorType.UNAUTHORIZED
    );
  }

  /**
   * Handle database errors and provide user-friendly messages
   */
  getErrorMessage(error: any): string {
    if (error instanceof AuthError) {
      switch (error.type) {
        case AuthErrorType.TOKEN_EXPIRED:
          return 'Your session has expired. Please sign in again.';
        case AuthErrorType.INVALID_TOKEN:
          return 'Invalid authentication. Please sign in again.';
        case AuthErrorType.UNAUTHORIZED:
          return 'You are not authorized to perform this action.';
        case AuthErrorType.NETWORK_ERROR:
          return 'Network error. Please check your connection and try again.';
        default:
          return 'An authentication error occurred.';
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'An unexpected error occurred.';
  }
}

const supabaseService = new SupabaseService();
export default supabaseService;
