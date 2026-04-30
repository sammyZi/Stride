/**
 * Sync type definitions for Supabase cloud synchronization.
 * Follows the design document's SyncService interface specification.
 */

/** Result of a sync operation. */
export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: SyncError[];
}

/** Individual sync error detail. */
export interface SyncError {
  itemId: string;
  operation: 'upload' | 'download';
  error: string;
  timestamp: number;
}

/** Result of migrating local data to cloud. */
export interface MigrationResult {
  success: boolean;
  migratedActivities: number;
  migratedGoals: number;
  migratedProfile: boolean;
  errors: string[];
}

/** A queued sync operation that failed and needs retry. */
export interface QueuedOperation {
  id: string;
  type: 'activity' | 'profile' | 'goal';
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
}

/** Interface for the SyncService. */
export interface ISyncService {
  // Initialization
  initialize(userId: string): Promise<void>;
  shutdown(): Promise<void>;

  // Sync operations
  syncActivity(activity: any): Promise<SyncResult>;
  syncAllActivities(): Promise<SyncResult>;
  syncUserProfile(profile: any): Promise<SyncResult>;
  syncGoals(): Promise<SyncResult>;

  // Download operations
  downloadAllData(): Promise<void>;

  // Migration
  migrateLocalDataToCloud(): Promise<MigrationResult>;

  // Conflict resolution
  resolveConflict(local: any, remote: any): any;

  // Queue management
  getQueuedOperations(): Promise<QueuedOperation[]>;
  retryFailedOperations(): Promise<void>;
}
