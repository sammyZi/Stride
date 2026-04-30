/**
 * SyncService — handles bidirectional synchronization between local
 * AsyncStorage and Supabase cloud storage.
 *
 * Responsibilities:
 *  - Upload activities, profiles, goals to Supabase (immediate on change)
 *  - Download all user data from Supabase (on login / app launch)
 *  - Merge downloaded data with local storage
 *  - Register as the StorageService sync callback for live writes
 *  - Retry failed operations with exponential backoff (1s → 2s → 4s)
 *  - Queue operations that exhaust retries for later processing
 *  - Process queued operations on launch and every 15 minutes
 *
 * Requirements covered: 2.4, 5.1, 5.2, 5.3, 5.4
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import StorageService from '../storage/StorageService';
import type { Activity, UserProfile, Goal } from '../../types';
import type { SyncResult, SyncError, QueuedOperation, MigrationResult } from '../../types/sync';
import { mapSyncError } from '../../utils/errors';
import { logger } from '../../utils/logger';

// ── Constants ────────────────────────────────────────────────────────────────

const SYNC_QUEUE_KEY = '@sync_queue';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1s → 2s → 4s
const BACKGROUND_SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

// ── Migration progress type ──────────────────────────────────────────────────

/** Progress info emitted during data migration. */
export interface MigrationProgress {
  /** Human-readable description of the current phase. */
  phase: string;
  /** Number of items completed so far. */
  completedItems: number;
  /** Total number of items to migrate. */
  totalItems: number;
  /** Completion percentage (0–100). */
  percent: number;
}

// ── Supabase ↔ Local type mappers ────────────────────────────────────────────

/** Convert a local Activity to a Supabase row. */
function activityToRow(activity: Activity, userId: string) {
  return {
    id: activity.id,
    user_id: userId,
    type: activity.type,
    start_time: new Date(activity.startTime).toISOString(),
    end_time: new Date(activity.endTime).toISOString(),
    duration: activity.duration,
    distance: activity.distance,
    steps: activity.steps,
    route: activity.route,
    average_pace: activity.averagePace,
    max_pace: activity.maxPace,
    calories: activity.calories,
    elevation_gain: activity.elevationGain ?? null,
    status: activity.status,
    created_at: new Date(activity.createdAt).toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/** Convert a Supabase activity row to a local Activity. */
function rowToActivity(row: any): Activity {
  return {
    id: row.id,
    type: row.type,
    startTime: new Date(row.start_time).getTime(),
    endTime: new Date(row.end_time).getTime(),
    duration: row.duration,
    distance: Number(row.distance),
    steps: row.steps,
    route: row.route,
    averagePace: Number(row.average_pace),
    maxPace: Number(row.max_pace),
    calories: row.calories,
    elevationGain: row.elevation_gain != null ? Number(row.elevation_gain) : undefined,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
  };
}

/** Convert a local UserProfile to a Supabase row. */
function profileToRow(profile: UserProfile, userId: string) {
  return {
    id: userId,
    name: profile.name,
    profile_picture_url: profile.profilePictureUri ?? null,
    weight: profile.weight ?? null,
    height: profile.height ?? null,
    updated_at: new Date().toISOString(),
  };
}

/** Convert a Supabase profile row to a local UserProfile. */
function rowToProfile(row: any): UserProfile {
  return {
    id: row.id,
    name: row.name,
    profilePictureUri: row.profile_picture_url ?? undefined,
    weight: row.weight != null ? Number(row.weight) : undefined,
    height: row.height != null ? Number(row.height) : undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

/** Convert a local Goal to a Supabase row. */
function goalToRow(goal: Goal, userId: string) {
  return {
    id: goal.id,
    user_id: userId,
    type: goal.type,
    target: goal.target,
    period: goal.period,
    start_date: new Date(goal.startDate).toISOString(),
    end_date: new Date(goal.endDate).toISOString(),
    progress: goal.progress,
    achieved: goal.achieved,
    created_at: new Date(goal.createdAt).toISOString(),
  };
}

/** Convert a Supabase goal row to a local Goal. */
function rowToGoal(row: any): Goal {
  return {
    id: row.id,
    type: row.type,
    target: Number(row.target),
    period: row.period,
    startDate: new Date(row.start_date).getTime(),
    endDate: new Date(row.end_date).getTime(),
    progress: Number(row.progress),
    achieved: row.achieved,
    createdAt: new Date(row.created_at).getTime(),
  };
}

// ── Helper ───────────────────────────────────────────────────────────────────

function makeSyncResult(
  syncedCount: number,
  failedCount: number,
  errors: SyncError[] = [],
): SyncResult {
  return {
    success: failedCount === 0,
    syncedCount,
    failedCount,
    errors,
  };
}

// ── Retry helper ─────────────────────────────────────────────────────────────

/** Sleep for `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Sync Queue (AsyncStorage-backed) ─────────────────────────────────────────

class SyncQueue {
  /** Load all queued operations from AsyncStorage. */
  async getAll(): Promise<QueuedOperation[]> {
    try {
      const json = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  }

  /** Add an operation to the queue. */
  async enqueue(op: QueuedOperation): Promise<void> {
    const queue = await this.getAll();
    queue.push(op);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  /** Remove an operation by ID. */
  async remove(opId: string): Promise<void> {
    const queue = await this.getAll();
    const filtered = queue.filter((o) => o.id !== opId);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
  }

  /** Update an operation in place (e.g. bump retryCount). */
  async update(op: QueuedOperation): Promise<void> {
    const queue = await this.getAll();
    const idx = queue.findIndex((o) => o.id === op.id);
    if (idx >= 0) {
      queue[idx] = op;
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    }
  }

  /** Clear the entire queue. */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
  }
}

// ── SyncService ──────────────────────────────────────────────────────────────

class SyncService {
  private _userId: string | null = null;
  private _initialized = false;
  private _queue = new SyncQueue();
  private _backgroundTimer: ReturnType<typeof setInterval> | null = null;

  // ── Lifecycle ───────────────────────────────────────────────────────────

  /**
   * Initialize the sync service for a given user.
   * Registers a sync callback on StorageService so future writes
   * are automatically pushed to Supabase.
   */
  async initialize(userId: string): Promise<void> {
    this._userId = userId;
    this._initialized = true;

    // Register ourselves as the sync callback
    StorageService.registerSyncCallback(
      (entityType, operation, data) => {
        // Fire-and-forget — errors are logged but don't block local writes
        this.handleSyncCallback(entityType, operation, data).catch((err) => {
          console.error('SyncService callback error:', err);
        });
      },
    );

    // Process any queued operations from previous sessions
    this.processQueue().catch((err) => {
      logger.error('SyncService: failed to process queue on init', err);
    });

    // Start periodic background sync
    this.startBackgroundSync();
  }

  /**
   * Shut down the sync service — unregister the callback and stop timers.
   */
  async shutdown(): Promise<void> {
    this.stopBackgroundSync();
    StorageService.registerSyncCallback(null);
    this._userId = null;
    this._initialized = false;
  }

  // ── Upload (individual) ─────────────────────────────────────────────────

  /**
   * Upload a single activity to Supabase (upsert).
   */
  async syncActivity(activity: Activity): Promise<SyncResult> {
    if (!this._userId) return makeSyncResult(0, 1, [{ itemId: activity.id, operation: 'upload', code: 'CONFIG_MISSING', error: 'Not initialized', timestamp: Date.now() }]);

    try {
      const row = activityToRow(activity, this._userId);
      const { error } = await supabase
        .from('activities')
        .upsert(row, { onConflict: 'id' });

      if (error) {
        const mappedError = mapSyncError(error.message, 'upload');
        logger.warn(`Failed to sync activity ${activity.id}`, mappedError);
        return makeSyncResult(0, 1, [{ itemId: activity.id, operation: 'upload', code: mappedError.code, error: mappedError.message, timestamp: Date.now() }]);
      }
      return makeSyncResult(1, 0);
    } catch (err: any) {
      const mappedError = mapSyncError(err, 'upload');
      logger.error(`Unexpected error syncing activity ${activity.id}`, err);
      return makeSyncResult(0, 1, [{ itemId: activity.id, operation: 'upload', code: mappedError.code, error: mappedError.message, timestamp: Date.now() }]);
    }
  }

  /**
   * Upload a user profile to Supabase (upsert).
   */
  async syncUserProfile(profile: UserProfile): Promise<SyncResult> {
    if (!this._userId) return makeSyncResult(0, 1, [{ itemId: 'profile', operation: 'upload', code: 'CONFIG_MISSING', error: 'Not initialized', timestamp: Date.now() }]);

    try {
      const row = profileToRow(profile, this._userId);
      const { error } = await supabase
        .from('user_profiles')
        .upsert(row, { onConflict: 'id' });

      if (error) {
        const mappedError = mapSyncError(error.message, 'upload');
        logger.warn('Failed to sync user profile', mappedError);
        return makeSyncResult(0, 1, [{ itemId: 'profile', operation: 'upload', code: mappedError.code, error: mappedError.message, timestamp: Date.now() }]);
      }
      return makeSyncResult(1, 0);
    } catch (err: any) {
      const mappedError = mapSyncError(err, 'upload');
      logger.error('Unexpected error syncing user profile', err);
      return makeSyncResult(0, 1, [{ itemId: 'profile', operation: 'upload', code: mappedError.code, error: mappedError.message, timestamp: Date.now() }]);
    }
  }

  /**
   * Upload all local goals to Supabase (upsert).
   */
  async syncGoals(): Promise<SyncResult> {
    if (!this._userId) return makeSyncResult(0, 1, [{ itemId: 'goals', operation: 'upload', code: 'CONFIG_MISSING', error: 'Not initialized', timestamp: Date.now() }]);

    const goals = await StorageService.getGoals();
    let synced = 0;
    let failed = 0;
    const errors: SyncError[] = [];

    for (const goal of goals) {
      try {
        const row = goalToRow(goal, this._userId);
        const { error } = await supabase
          .from('goals')
          .upsert(row, { onConflict: 'id' });

        if (error) {
          failed++;
          const mappedError = mapSyncError(error.message, 'upload');
          logger.warn(`Failed to sync goal ${goal.id}`, mappedError);
          errors.push({ itemId: goal.id, operation: 'upload', code: mappedError.code, error: mappedError.message, timestamp: Date.now() });
        } else {
          synced++;
        }
      } catch (err: any) {
        failed++;
        const mappedError = mapSyncError(err, 'upload');
        logger.error(`Unexpected error syncing goal ${goal.id}`, err);
        errors.push({ itemId: goal.id, operation: 'upload', code: mappedError.code, error: mappedError.message, timestamp: Date.now() });
      }
    }

    return makeSyncResult(synced, failed, errors);
  }

  /**
   * Upload all local activities to Supabase.
   */
  async syncAllActivities(): Promise<SyncResult> {
    if (!this._userId) return makeSyncResult(0, 1, [{ itemId: 'all', operation: 'upload', code: 'CONFIG_MISSING', error: 'Not initialized', timestamp: Date.now() }]);

    const activities = await StorageService.getActivities();
    let synced = 0;
    let failed = 0;
    const errors: SyncError[] = [];

    for (const activity of activities) {
      const result = await this.syncActivity(activity);
      synced += result.syncedCount;
      failed += result.failedCount;
      errors.push(...result.errors);
    }

    return makeSyncResult(synced, failed, errors);
  }

  // ── Data Migration ──────────────────────────────────────────────────────

  /**
   * Migrate all existing local data to Supabase cloud storage.
   *
   * Called when a user enables cloud-sync for the first time.
   * - Uploads all activities, profile, and goals
   * - Provides progress updates via optional callback
   * - Preserves all local data regardless of outcome (Req 8.4, 8.5)
   * - Collects errors per item so partial success is possible
   *
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
   */
  async migrateLocalDataToCloud(
    onProgress?: (progress: MigrationProgress) => void,
  ): Promise<MigrationResult> {
    if (!this._userId) {
      return {
        success: false,
        migratedActivities: 0,
        migratedGoals: 0,
        migratedProfile: false,
        errors: ['Migration failed: user not authenticated'],
      };
    }

    const errors: string[] = [];
    let migratedActivities = 0;
    let migratedGoals = 0;
    let migratedProfile = false;

    // Gather totals for progress tracking
    const activities = await StorageService.getActivities();
    const goals = await StorageService.getGoals();
    const profile = await StorageService.getUserProfile();

    const totalItems = activities.length + goals.length + (profile ? 1 : 0);
    let completedItems = 0;

    const reportProgress = (phase: string) => {
      if (onProgress) {
        onProgress({
          phase,
          completedItems,
          totalItems,
          percent: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 100,
        });
      }
    };

    // ── Phase 1: Upload profile ────────────────────────────────────────
    if (profile) {
      reportProgress('Uploading profile…');
      try {
        const row = profileToRow(profile, this._userId);
        const { error } = await supabase
          .from('user_profiles')
          .upsert(row, { onConflict: 'id' });

        if (error) {
          const mappedError = mapSyncError(error.message, 'upload');
          logger.warn(`Profile migration error`, mappedError);
          errors.push(`Profile: ${mappedError.message}`);
        } else {
          migratedProfile = true;
        }
      } catch (err: any) {
        const mappedError = mapSyncError(err, 'upload');
        logger.error(`Profile migration exception`, err);
        errors.push(`Profile: ${mappedError.message}`);
      }
      completedItems++;
      reportProgress('Profile uploaded');
    }

    // ── Phase 2: Upload activities ─────────────────────────────────────
    for (const activity of activities) {
      reportProgress(`Uploading activity ${migratedActivities + 1}/${activities.length}…`);
      try {
        const row = activityToRow(activity, this._userId!);
        const { error } = await supabase
          .from('activities')
          .upsert(row, { onConflict: 'id' });

        if (error) {
          const mappedError = mapSyncError(error.message, 'upload');
          logger.warn(`Activity migration error for ${activity.id}`, mappedError);
          errors.push(`Activity ${activity.id}: ${mappedError.message}`);
        } else {
          migratedActivities++;
        }
      } catch (err: any) {
        const mappedError = mapSyncError(err, 'upload');
        logger.error(`Activity migration exception for ${activity.id}`, err);
        errors.push(`Activity ${activity.id}: ${mappedError.message}`);
      }
      completedItems++;
      reportProgress(`Activities: ${migratedActivities}/${activities.length}`);
    }

    // ── Phase 3: Upload goals ──────────────────────────────────────────
    for (const goal of goals) {
      reportProgress(`Uploading goal ${migratedGoals + 1}/${goals.length}…`);
      try {
        const row = goalToRow(goal, this._userId!);
        const { error } = await supabase
          .from('goals')
          .upsert(row, { onConflict: 'id' });

        if (error) {
          const mappedError = mapSyncError(error.message, 'upload');
          logger.warn(`Goal migration error for ${goal.id}`, mappedError);
          errors.push(`Goal ${goal.id}: ${mappedError.message}`);
        } else {
          migratedGoals++;
        }
      } catch (err: any) {
        const mappedError = mapSyncError(err, 'upload');
        logger.error(`Goal migration exception for ${goal.id}`, err);
        errors.push(`Goal ${goal.id}: ${mappedError.message}`);
      }
      completedItems++;
      reportProgress(`Goals: ${migratedGoals}/${goals.length}`);
    }

    // ── Done ───────────────────────────────────────────────────────────
    const success = errors.length === 0;
    reportProgress(success ? 'Migration complete!' : 'Migration completed with errors');

    return {
      success,
      migratedActivities,
      migratedGoals,
      migratedProfile,
      errors,
    };
  }

  // ── Download ────────────────────────────────────────────────────────────

  /**
   * Download all user data from Supabase and merge with local storage.
   * Called on login / session restore when in cloud-sync mode.
   */
  async downloadAllData(): Promise<void> {
    if (!this._userId) return;

    await Promise.all([
      this.downloadActivities(),
      this.downloadProfile(),
      this.downloadGoals(),
    ]);
  }

  /** Download and merge activities with conflict resolution. */
  private async downloadActivities(): Promise<void> {
    if (!this._userId) return;

    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', this._userId)
        .order('start_time', { ascending: false });

      if (error || !data) return;

      const localActivities = await StorageService.getActivities();
      const localMap = new Map(localActivities.map((a) => [a.id, a]));

      for (const row of data) {
        const remote = rowToActivity(row);
        const local = localMap.get(remote.id);

        if (!local) {
          // New from cloud — save locally
          await StorageService.saveActivity(remote);
        } else {
          // Both exist — resolve conflict using timestamps
          const winner = this.resolveConflict(
            { ...local, _timestamp: local.createdAt },
            { ...remote, _timestamp: remote.createdAt },
          );
          if (winner === remote) {
            await StorageService.saveActivity(remote);
          }
          // If local wins, nothing to do — it's already saved
        }
      }
    } catch (err) {
      logger.error('Error downloading activities', err);
    }
  }

  /** Download and merge profile with conflict resolution. */
  private async downloadProfile(): Promise<void> {
    if (!this._userId) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', this._userId)
        .single();

      if (error || !data) return;

      const remoteProfile = rowToProfile(data);
      const localProfile = await StorageService.getUserProfile();

      if (!localProfile) {
        // No local profile — use cloud version
        await StorageService.saveUserProfile(remoteProfile);
      } else {
        // Both exist — resolve conflict using updatedAt
        const winner = this.resolveConflict(
          { ...localProfile, _timestamp: localProfile.updatedAt },
          { ...remoteProfile, _timestamp: remoteProfile.updatedAt },
        );
        if (winner === remoteProfile) {
          await StorageService.saveUserProfile(remoteProfile);
        }
      }
    } catch (err) {
      logger.error('Error downloading profile', err);
    }
  }

  /** Download and merge goals with conflict resolution. */
  private async downloadGoals(): Promise<void> {
    if (!this._userId) return;

    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', this._userId);

      if (error || !data) return;

      const localGoals = await StorageService.getGoals();
      const localMap = new Map(localGoals.map((g) => [g.id, g]));

      for (const row of data) {
        const remote = rowToGoal(row);
        const local = localMap.get(remote.id);

        if (!local) {
          await StorageService.saveGoal(remote);
        } else {
          // Both exist — resolve conflict using createdAt
          const winner = this.resolveConflict(
            { ...local, _timestamp: local.createdAt },
            { ...remote, _timestamp: remote.createdAt },
          );
          if (winner === remote) {
            await StorageService.saveGoal(remote);
          }
        }
      }
    } catch (err) {
      logger.error('Error downloading goals', err);
    }
  }

  // ── Conflict resolution ────────────────────────────────────────────────

  /**
   * Resolve a conflict between a local and remote version of the same entity.
   *
   * Strategy: **last-write-wins**.
   *  - Compare `_timestamp` (ms since epoch) on each object.
   *  - The version with the higher (more recent) timestamp wins.
   *  - If timestamps are identical, the remote version wins
   *    (server is the source of truth).
   *
   * Requirements: 5.6
   */
  resolveConflict<T extends { _timestamp: number }>(
    local: T,
    remote: T,
  ): T {
    if (local._timestamp > remote._timestamp) {
      return local;
    }
    // Remote wins on equal timestamps (tiebreaker)
    return remote;
  }

  // ── Sync callback handler ──────────────────────────────────────────────

  /**
   * Called by StorageService whenever a write happens in cloud-sync mode.
   * Attempts immediate sync with retry + exponential backoff.
   * If all retries fail, the operation is queued for later processing.
   */
  private async handleSyncCallback(
    entityType: 'activity' | 'profile' | 'goal',
    operation: 'create' | 'update' | 'delete',
    data: any,
  ): Promise<void> {
    if (!this._userId || !this._initialized) return;

    const success = await this.executeWithRetry(entityType, operation, data);

    if (!success) {
      // All retries exhausted — queue for later
      const queuedOp: QueuedOperation = {
        id: `${entityType}_${data.id ?? 'profile'}_${Date.now()}`,
        type: entityType,
        operation,
        data,
        timestamp: Date.now(),
        retryCount: MAX_RETRIES,
      };
      await this._queue.enqueue(queuedOp);
      logger.warn(`SyncService: queued ${entityType} (${operation}) for later retry`);
    }
  }

  // ── Retry with exponential backoff ─────────────────────────────────────

  /**
   * Execute a single Supabase operation with up to MAX_RETRIES attempts
   * and exponential backoff (1 s → 2 s → 4 s).
   *
   * Returns `true` if the operation eventually succeeded.
   */
  private async executeWithRetry(
    entityType: 'activity' | 'profile' | 'goal',
    operation: 'create' | 'update' | 'delete',
    data: any,
  ): Promise<boolean> {
    let attempt = 0;
    let delay = BASE_DELAY_MS;

    while (attempt < MAX_RETRIES) {
      try {
        await this.executeSyncOperation(entityType, operation, data);
        return true;
      } catch (err) {
        attempt++;
        if (attempt < MAX_RETRIES) {
          await sleep(delay);
          delay *= 2; // exponential backoff
        }
      }
    }

    return false;
  }

  /**
   * Execute a single Supabase sync operation (no retry).
   * Throws on failure so the caller can decide whether to retry.
   */
  private async executeSyncOperation(
    entityType: 'activity' | 'profile' | 'goal',
    operation: 'create' | 'update' | 'delete',
    data: any,
  ): Promise<void> {
    if (!this._userId) throw new Error('Not initialized');

    switch (entityType) {
      case 'activity':
        if (operation === 'delete') {
          const { error: delErr } = await supabase.from('activities').delete().eq('id', data.id);
          if (delErr) throw delErr;
        } else {
          const row = activityToRow(data, this._userId);
          const { error } = await supabase.from('activities').upsert(row, { onConflict: 'id' });
          if (error) throw error;
        }
        break;

      case 'profile': {
        const profileRow = profileToRow(data, this._userId);
        const { error } = await supabase.from('user_profiles').upsert(profileRow, { onConflict: 'id' });
        if (error) throw error;
        break;
      }

      case 'goal':
        if (operation === 'delete') {
          const { error: delErr } = await supabase.from('goals').delete().eq('id', data.id);
          if (delErr) throw delErr;
        } else {
          const goalRow = goalToRow(data, this._userId);
          const { error } = await supabase.from('goals').upsert(goalRow, { onConflict: 'id' });
          if (error) throw error;
        }
        break;
    }
  }

  // ── Queue management ───────────────────────────────────────────────────

  /**
   * Return all currently queued operations.
   */
  async getQueuedOperations(): Promise<QueuedOperation[]> {
    return this._queue.getAll();
  }

  /**
   * Process all queued operations — retry each with backoff.
   * Successfully completed operations are removed from the queue;
   * those that fail again stay queued with an incremented retryCount.
   */
  async processQueue(): Promise<void> {
    if (!this._userId || !this._initialized) return;

    const ops = await this._queue.getAll();
    if (ops.length === 0) return;

    logger.log(`SyncService: processing ${ops.length} queued operation(s)`);

    for (const op of ops) {
      const success = await this.executeWithRetry(op.type, op.operation, op.data);

      if (success) {
        await this._queue.remove(op.id);
      } else {
        // Bump retry count but keep in queue
        await this._queue.update({ ...op, retryCount: op.retryCount + MAX_RETRIES });
      }
    }
  }

  /**
   * Alias for processQueue — retries all failed operations.
   */
  async retryFailedOperations(): Promise<void> {
    return this.processQueue();
  }

  // ── Background sync ────────────────────────────────────────────────────

  /**
   * Start a periodic timer that processes the queue every 15 minutes.
   */
  private startBackgroundSync(): void {
    this.stopBackgroundSync();
    this._backgroundTimer = setInterval(() => {
      this.processQueue().catch((err) => {
        logger.error('SyncService: background sync error', err);
      });
    }, BACKGROUND_SYNC_INTERVAL_MS);
  }

  /**
   * Stop the background sync timer.
   */
  private stopBackgroundSync(): void {
    if (this._backgroundTimer) {
      clearInterval(this._backgroundTimer);
      this._backgroundTimer = null;
    }
  }
}

// Export singleton instance
export default new SyncService();
