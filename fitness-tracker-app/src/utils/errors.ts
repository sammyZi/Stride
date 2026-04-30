/**
 * Error Mapping & Handling Utilities
 *
 * Maps Supabase and generic application errors to structured error codes
 * and user-friendly messages as defined in the design documentation.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.5
 */

import { AuthError } from '../types/auth';

// ── Auth Error Mapping ──────────────────────────────────────────────────────

export function mapAuthError(errorOrMessage: any): AuthError {
  const message = typeof errorOrMessage === 'string' 
    ? errorOrMessage 
    : errorOrMessage?.message || '';
    
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
  if (lower.includes('password') && lower.includes('weak')) {
    return {
      code: 'AUTH_WEAK_PASSWORD',
      message: 'Password must be at least 6 characters',
    };
  }
  if (lower.includes('expired')) {
    return {
      code: 'AUTH_SESSION_EXPIRED',
      message: 'Your session has expired. Please log in again',
    };
  }

  return {
    code: 'AUTH_UNKNOWN_ERROR',
    message: 'An unexpected error occurred. Please try again',
  };
}

// ── Sync Error Mapping ──────────────────────────────────────────────────────

export type SyncErrorCode = 
  | 'SYNC_TIMEOUT'
  | 'SYNC_UPLOAD_FAILED'
  | 'SYNC_DOWNLOAD_FAILED'
  | 'SYNC_CONFLICT'
  | 'SYNC_STORAGE_FULL'
  | 'SYNC_PERMISSION_DENIED'
  | 'CONFIG_MISSING'
  | 'CONFIG_INVALID'
  | 'SYNC_UNKNOWN_ERROR';

export interface StructuredSyncError {
  code: SyncErrorCode;
  message: string;
}

export function mapSyncError(errorOrMessage: any, operation: 'upload' | 'download'): StructuredSyncError {
  const message = typeof errorOrMessage === 'string' 
    ? errorOrMessage 
    : errorOrMessage?.message || '';
    
  const lower = message.toLowerCase();

  if (lower.includes('timeout') || lower.includes('abort')) {
    return {
      code: 'SYNC_TIMEOUT',
      message: 'Sync is taking longer than expected. Will retry automatically',
    };
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return {
      code: operation === 'upload' ? 'SYNC_UPLOAD_FAILED' : 'SYNC_DOWNLOAD_FAILED',
      message: operation === 'upload' 
        ? 'Unable to sync data. Changes saved locally and will sync when connection improves'
        : 'Unable to download cloud data. Using local data',
    };
  }
  if (lower.includes('permission denied') || lower.includes('unauthorized') || lower.includes('401') || lower.includes('403')) {
    return {
      code: 'SYNC_PERMISSION_DENIED',
      message: 'Unable to access cloud storage. Please log in again',
    };
  }
  if (lower.includes('quota') || lower.includes('storage full')) {
    return {
      code: 'SYNC_STORAGE_FULL',
      message: 'Cloud storage is full. Please free up space',
    };
  }

  return {
    code: 'SYNC_UNKNOWN_ERROR',
    message: 'An unexpected sync error occurred.',
  };
}
