/**
 * useStatistics Hook
 * Custom hook for fetching and managing statistics data
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import StorageService from '../services/storage/StorageService';
import { Statistics, StatsPeriod } from '../types';
import { useSync } from '../context';

interface UseStatisticsReturn {
  stats: Statistics | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export const useStatistics = (period: StatsPeriod, dateRange?: { startDate: number; endDate: number }): UseStatisticsReturn => {
  const { syncVersion } = useSync();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadStatistics = useCallback(async (silent: boolean = false) => {
    try {
      // On a silent refresh keep the existing stats visible (no spinner)
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      const statistics = await StorageService.getStatistics(period, dateRange);
      setStats(statistics);
    } catch (err) {
      console.error('Error loading statistics:', err);
      setError(err instanceof Error ? err : new Error('Failed to load statistics'));
    } finally {
      setLoading(false);
    }
  }, [period, dateRange?.startDate, dateRange?.endDate]);

  const refresh = useCallback(async () => {
    await loadStatistics();
  }, [loadStatistics]);

  // Load stats when period changes or when cloud data is downloaded
  useEffect(() => {
    loadStatistics();
  }, [loadStatistics, syncVersion]);

  // Silently reload whenever the screen regains focus so the latest
  // activity data is reflected without a manual refresh.
  // Defer until after the tab slide animation finishes for smoothness.
  // Skip the first focus (mount) since the effect above already loads.
  const didMountRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!didMountRef.current) {
        didMountRef.current = true;
        return;
      }
      const task = InteractionManager.runAfterInteractions(() => {
        loadStatistics(true);
      });
      return () => task.cancel();
    }, [loadStatistics])
  );

  return {
    stats,
    loading,
    error,
    refresh,
  };
};
