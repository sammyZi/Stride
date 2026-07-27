/**
 * useActivityHistory Hook
 * Custom hook for managing activity history with filtering and pagination
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import StorageService from '../services/storage/StorageService';
import { Activity, ActivityType, ActivityFilters } from '../types';
import { useSync } from '../context';

interface UseActivityHistoryOptions {
  itemsPerPage?: number;
  autoLoad?: boolean;
}

interface UseActivityHistoryReturn {
  activities: Activity[];
  allActivities: Activity[];
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  hasMore: boolean;
  error: Error | null;
  activityTypeFilter: ActivityType | 'all';
  dateRangeFilter: 'all' | 'week' | 'month' | 'year';
  setActivityTypeFilter: (filter: ActivityType | 'all') => void;
  setDateRangeFilter: (filter: 'all' | 'week' | 'month' | 'year') => void;
  refresh: (silent?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  reload: () => Promise<void>;
}

export const useActivityHistory = (
  options: UseActivityHistoryOptions = {}
): UseActivityHistoryReturn => {
  const { itemsPerPage = 20, autoLoad = true } = options;
  const { syncVersion } = useSync();

  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(autoLoad);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadingMoreRef = useRef(false);

  // Filter states
  const [activityTypeFilter, setActivityTypeFilter] = useState<ActivityType | 'all'>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');

  /**
   * Load activities from storage with filters
   */
  const loadActivities = useCallback(
    async (reset: boolean = false, silent: boolean = false) => {
      try {
        if (reset) {
          // Only show loading spinner on first load (when no data yet).
          // For subsequent reloads, keep existing data visible to avoid flicker.
          if (!silent && allActivities.length === 0) {
            setLoading(true);
          }
          setPage(1);
          setError(null);
        }

        const filters: ActivityFilters = {};

        // Apply date range filter
        if (dateRangeFilter !== 'all') {
          const now = Date.now();
          switch (dateRangeFilter) {
            case 'week':
              filters.startDate = now - 7 * 24 * 60 * 60 * 1000;
              break;
            case 'month':
              filters.startDate = now - 30 * 24 * 60 * 60 * 1000;
              break;
            case 'year':
              filters.startDate = now - 365 * 24 * 60 * 60 * 1000;
              break;
          }
        }

        // Apply activity type filter
        if (activityTypeFilter !== 'all') {
          filters.type = activityTypeFilter;
        }

        const fetchedActivities = await StorageService.getActivities(filters);
        setAllActivities(fetchedActivities);

        // Paginate
        const currentPage = reset ? 1 : page;
        const paginatedActivities = fetchedActivities.slice(0, currentPage * itemsPerPage);
        setActivities(paginatedActivities);
        setHasMore(paginatedActivities.length < fetchedActivities.length);
      } catch (err) {
        console.error('Error loading activities:', err);
        setError(err instanceof Error ? err : new Error('Failed to load activities'));
      } finally {
        setLoading(false);
        setRefreshing(false);
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    },
    [dateRangeFilter, activityTypeFilter, page, itemsPerPage, allActivities.length]
  );

  /**
   * Refresh activities (pull-to-refresh)
   */
  const refresh = useCallback(async (silent: boolean = false) => {
    if (!silent) {
      setRefreshing(true);
    }
    await loadActivities(true, silent);
  }, [loadActivities]);

  /**
   * Load more activities (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!loading && !loadingMoreRef.current && hasMore) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
      setPage((prev) => prev + 1);
    }
  }, [loading, hasMore]);

  /**
   * Reload activities (force reload)
   */
  const reload = useCallback(async () => {
    await loadActivities(true);
  }, [loadActivities]);

  // Load activities when filters change or when cloud data is downloaded
  useEffect(() => {
    if (autoLoad) {
      loadActivities(true);
    }
  }, [dateRangeFilter, activityTypeFilter, syncVersion]);

  // Silently reload whenever the screen regains focus so newly tracked
  // activities appear without a manual pull-to-refresh.
  // Defer until after the tab slide animation finishes for smoothness.
  // Skip the first focus (mount) since the effect above already loads.
  const didMountRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!didMountRef.current) {
        didMountRef.current = true;
        return;
      }
      if (autoLoad) {
        const task = InteractionManager.runAfterInteractions(() => {
          refresh(true);
        });
        return () => task.cancel();
      }
    }, [autoLoad, refresh])
  );

  // Load more when page changes
  useEffect(() => {
    if (page > 1) {
      loadActivities(false);
    }
  }, [page]);

  return {
    activities,
    allActivities,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    error,
    activityTypeFilter,
    dateRangeFilter,
    setActivityTypeFilter,
    setDateRangeFilter,
    refresh,
    loadMore,
    reload,
  };
};
