/**
 * useGoals Hook
 * Custom hook for managing goals
 */

import { useState, useEffect, useCallback } from 'react';
import { Goal, GoalType, GoalPeriod } from '../types';
import StorageService from '../services/storage/StorageService';
import GoalsService from '../services/goals/GoalsService';

/** Generate a UUID v4 string. */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [achievedGoals, setAchievedGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Update progress for all goals
      await GoalsService.updateAllGoalsProgress();

      // Load all goals
      const allGoals = await StorageService.getGoals();
      setGoals(allGoals);

      // Filter active and achieved goals
      const active = await GoalsService.getActiveGoals();
      const achieved = await GoalsService.getAchievedGoals();

      setActiveGoals(active);
      setAchievedGoals(achieved);
    } catch (err) {
      console.error('Error loading goals:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const createGoal = useCallback(
    async (type: GoalType, target: number, period: GoalPeriod): Promise<void> => {
      try {
        const { startDate, endDate } = GoalsService.createGoalPeriod(period);

        const newGoal: Goal = {
          id: generateUUID(),
          type,
          target,
          period,
          startDate,
          endDate,
          progress: 0,
          achieved: false,
          createdAt: Date.now(),
        };

        // Calculate initial progress
        const progress = await GoalsService.calculateGoalProgress(newGoal);
        newGoal.progress = progress;
        newGoal.achieved = progress >= target;

        await StorageService.saveGoal(newGoal);
        await loadGoals();
      } catch (err) {
        console.error('Error creating goal:', err);
        throw err;
      }
    },
    [loadGoals]
  );

  const updateGoal = useCallback(
    async (goalId: string, updates: Partial<Goal>): Promise<void> => {
      try {
        await StorageService.updateGoal(goalId, updates);
        await loadGoals();
      } catch (err) {
        console.error('Error updating goal:', err);
        throw err;
      }
    },
    [loadGoals]
  );

  const deleteGoal = useCallback(
    async (goalId: string): Promise<void> => {
      try {
        await StorageService.deleteGoal(goalId);
        await loadGoals();
      } catch (err) {
        console.error('Error deleting goal:', err);
        throw err;
      }
    },
    [loadGoals]
  );

  const refresh = useCallback(async () => {
    await loadGoals();
  }, [loadGoals]);

  return {
    goals,
    activeGoals,
    achievedGoals,
    loading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    refresh,
  };
};
