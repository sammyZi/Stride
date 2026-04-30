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
import type { SyncResult, SyncError, QueuedOperation } from '../../types/sync';

// ── Constants ────────────────────────────────────────────────────────────────

const SYNC_QUEUE_KEY = '@sync_queue';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1s → 2s → 4s
const BACKGROUND_SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

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
      console.error('SyncService: failed to process queue on init:', err);
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
    if (!this._userId) return makeSyncResult(0, 1, [{ itemId: activity.id, operation: 'upload', error: 'Not initialized', timestamp: Date.now() }]);

    try {
      const row = activityToRow(activity, this._userId);
      const { error } = await supabase
        .from('activities')
        .upsert(row, { onConflict: 'id' });

      if (error) {
        return makeSyncResult(0, 1, [{ itemId: activity.id, operation: 'upload', error: error.message, timestamp: Date.now() }]);
      }
      return makeSyncResult(1, 0);
    } catch (err: any) {
      return makeSyncResult(0, 1, [{ itemId: activity.id, operation: 'upload', error: err?.message ?? 'Unknown', timestamp: Date.now() }]);
    }
  }

  /**
   * Upload a user profile to Supabase (upsert).
   */
  async syncUserProfile(profile: UserProfile): Promise<SyncResult> {
    if (!this._userId) return makeSyncResult(0, 1, [{ itemId: 'profile', operation: 'upload', error: 'Not initialized', timestamp: Date.now() }]);

    try {
      const row = profileToRow(profile, this._userId);
      const { error } = await supabase
        .from('user_profiles')
        .upsert(row, { onConflict: 'id' });

      if (error) {
        return makeSyncResult(0, 1, [{ itemId: 'profile', operation: 'upload', error: error.message, timestamp: Date.now() }]);
      }
      return makeSyncResult(1, 0);
    } catch (err: any) {
      return makeSyncResult(0, 1, [{ itemId: 'profile', operation: 'upload', error: err?.message ?? 'Unknown', timestamp: Date.now() }]);
    }
  }

  /**
   * Upload all local goals to Supabase (upsert).
   */
  async syncGoals(): Promise<SyncResult> {
    if (!this._userId) return makeSyncResult(0, 1, [{ itemId: 'goals', operation: 'upload', error: 'Not initialized', timestamp: Date.now() }]);

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
          errors.push({ itemId: goal.id, operation: 'upload', error: error.message, timestamp: Date.now() });
        } else {
          synced++;
        }
      } catch (err: any) {
        failed++;
        errors.push({ itemId: goal.id, operation: 'upload', error: err?.message ?? 'Unknown', timestamp: Date.now() });
      }
    }

    return makeSyncResult(synced, failed, errors);
  }

  /**
   * Upload all local activities to Supabase.
   */
  async syncAllActivities(): Promise<SyncResult> {
    if (!this._userId) return makeSyncResult(0, 1, [{ itemId: 'all', operation: 'upload', error: 'Not initialized', timestamp: Date.now() }]);

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

  /** Download and merge activities. */
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
        if (!localMap.has(remote.id)) {
          // New from cloud — save locally
          await StorageService.saveActivity(remote);
        }
        // If it exists locally, keep local (conflict resolution handled later in Task 9)
      }
    } catch (err) {
      console.error('Error downloading activities:', err);
    }
  }

  /** Download and merge profile. */
  private async downloadProfile(): Promise<void> {
    if (!this._userId) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', this._userId)
        .single();

      if (error || !data) return;

      const localProfile = await StorageService.getUserProfile();
      if (!localProfile) {
        // No local profile — use cloud version
        await StorageService.saveUserProfile(rowToProfile(data));
      }
      // If local exists, keep local (conflict resolution in Task 9)
    } catch (err) {
      console.error('Error downloading profile:', err);
    }
  }

  /** Download and merge goals. */
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
        if (!localMap.has(remote.id)) {
          await StorageService.saveGoal(remote);
        }
      }
    } catch (err) {
      console.error('Error downloading goals:', err);
    }
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
      console.warn(`SyncService: queued ${entityType} (${operation}) for later retry`);
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

    console.log(`SyncService: processing ${ops.length} queued operation(s)`);

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
        console.error('SyncService: background sync error:', err);
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
