/**
 * Sync Context
 *
 * Provides global access to sync state including:
 *  - Whether a sync is in progress
 *  - Last successful sync time
 *  - Queued operations count
 *  - Sync errors with retry capability
 *  - Network connectivity status
 *
 * Requirements: 5.1, 5.4, 9.1, 9.2, 9.3
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

import SyncService from '../services/sync/SyncService';
import StorageService from '../services/storage/StorageService';
import { useAuth } from './AuthContext';

// ── Constants ────────────────────────────────────────────────────────────────

const LAST_SYNC_KEY = '@last_sync_time';
const POLL_INTERVAL_MS = 30_000; // poll queue every 30s

// ── Types ────────────────────────────────────────────────────────────────────

export interface SyncNotification {
  id: string;
  type: 'error' | 'success' | 'info';
  title: string;
  message: string;
  /** If present, the toast shows a "Retry" button. */
  onRetry?: () => void;
  /** Auto-dismiss after ms (0 = manual dismiss). */
  duration: number;
  timestamp: number;
}

export interface SyncContextValue {
  /** True while any sync operation is in flight. */
  isSyncing: boolean;
  /** Timestamp (ms) of the last successful sync, or null. */
  lastSyncTime: number | null;
  /** Human-readable version of lastSyncTime. */
  lastSyncLabel: string | null;
  /** Number of operations currently queued for retry. */
  queuedCount: number;
  /** Whether the device has internet connectivity. */
  isOnline: boolean;
  /** Whether cloud sync mode is enabled. */
  isCloudSyncEnabled: boolean;
  /** Active toast notifications. */
  notifications: SyncNotification[];
  /** Dismiss a specific notification by ID. */
  dismissNotification: (id: string) => void;
  /** Trigger a manual full sync. */
  triggerSync: () => Promise<void>;
  /** Retry all queued / failed operations. */
  retryFailed: () => Promise<void>;
}

// ── Context ──────────────────────────────────────────────────────────────────

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────────────────────

export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [notifications, setNotifications] = useState<SyncNotification[]>([]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── Derived ───────────────────────────────────────────────────────────

  const isCloudSyncEnabled = StorageService.getStorageMode() === 'cloud-sync';

  // ── Helpers ───────────────────────────────────────────────────────────

  const formatSyncTime = useCallback((timestamp: number): string => {
    const diff = Date.now() - timestamp;
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;

    const date = new Date(timestamp);
    const now = new Date();
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const lastSyncLabel = lastSyncTime ? formatSyncTime(lastSyncTime) : null;

  // ── Notification management ───────────────────────────────────────────

  const addNotification = useCallback((notif: Omit<SyncNotification, 'id' | 'timestamp'>) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const entry: SyncNotification = { ...notif, id, timestamp: Date.now() };

    setNotifications((prev) => {
      // Cap at 5 notifications
      const next = [...prev, entry];
      if (next.length > 5) next.shift();
      return next;
    });

    if (notif.duration > 0) {
      const timer = setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        dismissTimers.current.delete(id);
      }, notif.duration);
      dismissTimers.current.set(id, timer);
    }
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const timer = dismissTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      dismissTimers.current.delete(id);
    }
  }, []);

  // ── Network connectivity ──────────────────────────────────────────────

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected ?? true;
      setIsOnline(online);

      if (!online && isCloudSyncEnabled) {
        addNotification({
          type: 'info',
          title: 'You\'re Offline',
          message: 'Changes will sync when connection is restored.',
          duration: 4000,
        });
      }
    });

    return () => unsub();
  }, [isCloudSyncEnabled, addNotification]);

  // ── Auto-enable & initialize cloud sync on login ────────────────────────
  //
  // When a user is authenticated:
  //   • If cloud-sync is already enabled → just re-initialize SyncService.
  //   • If cloud-sync is NOT yet enabled → enable it automatically so the
  //     user doesn't have to toggle it manually after every login.

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const initSync = async () => {
      try {
        if (!isCloudSyncEnabled) {
          // Auto-enable cloud sync for logged-in users
          await StorageService.enableCloudSync(user.id);
          console.log('[Sync] Cloud sync auto-enabled for user', user.id);
        }
        await SyncService.initialize(user.id);
        console.log('[Sync] SyncService initialized');
      } catch (err) {
        console.error('[Sync] Auto-init failed:', err);
      }
    };

    initSync();

    return () => {
      // Shut down when user logs out
      SyncService.shutdown().catch(() => {});
    };
  }, [isAuthenticated, user]);

  // ── Restore last sync time ────────────────────────────────────────────

  useEffect(() => {
    AsyncStorage.getItem(LAST_SYNC_KEY).then((v) => {
      if (v) setLastSyncTime(parseInt(v, 10));
    });
  }, []);

  // ── Poll queue count ──────────────────────────────────────────────────

  const refreshQueueCount = useCallback(async () => {
    try {
      const ops = await SyncService.getQueuedOperations();
      setQueuedCount(ops.length);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && isCloudSyncEnabled) {
      refreshQueueCount();
      pollRef.current = setInterval(refreshQueueCount, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [isAuthenticated, isCloudSyncEnabled, refreshQueueCount]);

  // ── Manual sync ───────────────────────────────────────────────────────

  const triggerSync = useCallback(async () => {
    if (!isAuthenticated || !user || !isCloudSyncEnabled || isSyncing) return;

    setIsSyncing(true);
    try {
      const result = await SyncService.syncAllActivities();
      const goalsResult = await SyncService.syncGoals();

      const profile = await StorageService.getUserProfile();
      const profileResult = profile
        ? await SyncService.syncUserProfile(profile)
        : { syncedCount: 0, failedCount: 0, success: true, errors: [] as any[] };

      const totalFailed =
        result.failedCount + goalsResult.failedCount + profileResult.failedCount;

      const now = Date.now();
      if (totalFailed === 0) {
        await AsyncStorage.setItem(LAST_SYNC_KEY, String(now));
        setLastSyncTime(now);
        addNotification({
          type: 'success',
          title: 'Sync Complete',
          message: 'All data synced successfully.',
          duration: 3000,
        });
      } else {
        console.error(`[Sync] ${totalFailed} item(s) failed to sync.`, {
          activities: result.failedCount,
          goals: goalsResult.failedCount,
          profile: profileResult.failedCount,
        });
        // Log individual error details for debugging
        const allErrors = [
          ...result.errors.map(e => `Activity(${e.itemId}): [${e.code}] ${e.error}`),
          ...goalsResult.errors.map(e => `Goal(${e.itemId}): [${e.code}] ${e.error}`),
          ...profileResult.errors.map(e => `Profile: [${e.code}] ${e.error}`),
        ];
        allErrors.forEach(msg => console.error(`[Sync]   └─ ${msg}`));
        addNotification({
          type: 'error',
          title: 'Sync Issues',
          message: `${totalFailed} item(s) failed to sync. Will retry automatically.`,
          onRetry: () => retryFailed(),
          duration: 6000,
        });
      }

      await refreshQueueCount();
    } catch (err) {
      console.error('[Sync] triggerSync failed:', err);
      addNotification({
        type: 'error',
        title: 'Sync Failed',
        message: isOnline
          ? 'An unexpected error occurred. Please try again.'
          : 'No internet connection. Changes will sync when you\'re back online.',
        onRetry: () => triggerSync(),
        duration: 5000,
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, user, isCloudSyncEnabled, isSyncing, isOnline, addNotification, refreshQueueCount]);

  // ── Retry failed ──────────────────────────────────────────────────────

  const retryFailed = useCallback(async () => {
    if (!isAuthenticated || !isCloudSyncEnabled || isSyncing) return;

    setIsSyncing(true);
    try {
      await SyncService.retryFailedOperations();

      const remaining = await SyncService.getQueuedOperations();
      setQueuedCount(remaining.length);

      if (remaining.length === 0) {
        const now = Date.now();
        await AsyncStorage.setItem(LAST_SYNC_KEY, String(now));
        setLastSyncTime(now);
        addNotification({
          type: 'success',
          title: 'Retry Successful',
          message: 'All queued operations completed.',
          duration: 3000,
        });
      } else {
        console.warn(`[Sync] Retry partial: ${remaining.length} operation(s) still pending.`);
        addNotification({
          type: 'error',
          title: 'Partial Retry',
          message: `${remaining.length} operation(s) still pending.`,
          onRetry: () => retryFailed(),
          duration: 5000,
        });
      }
    } catch (err) {
      console.error('[Sync] retryFailed failed:', err);
      addNotification({
        type: 'error',
        title: 'Retry Failed',
        message: 'Unable to process queued operations.',
        onRetry: () => retryFailed(),
        duration: 5000,
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, isCloudSyncEnabled, isSyncing, addNotification]);

  // ── Cleanup timers on unmount ─────────────────────────────────────────

  useEffect(() => {
    return () => {
      dismissTimers.current.forEach((timer) => clearTimeout(timer));
      dismissTimers.current.clear();
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <SyncContext.Provider
      value={{
        isSyncing,
        lastSyncTime,
        lastSyncLabel,
        queuedCount,
        isOnline,
        isCloudSyncEnabled,
        notifications,
        dismissNotification,
        triggerSync,
        retryFailed,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useSync = (): SyncContextValue => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
