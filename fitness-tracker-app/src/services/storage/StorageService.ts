/**
 * StorageService - Local data persistence using AsyncStorage
 * Handles all data storage operations for the Fitness Tracker App.
 *
 * Extended to support storage mode awareness (local-only vs cloud-sync)
 * for Supabase cloud integration. Requirements: 4.1, 4.3–4.5, 6.1, 6.2
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Activity,
  ActivityFilters,
  UserProfile,
  UserSettings,
  Goal,
  Statistics,
  StatsPeriod,
  PersonalRecords,
  ActivityRecord,
} from '../../types';
import personalRecordsService from '../personalRecords/PersonalRecordsService';

// ── Storage mode types ──────────────────────────────────────────────────────

export type StorageMode = 'local-only' | 'cloud-sync';

/**
 * Callback invoked by StorageService whenever data is written in cloud-sync
 * mode. The SyncService (implemented later) will register itself here to
 * receive live change notifications.
 */
export type SyncCallback = (
  entityType: 'activity' | 'profile' | 'goal',
  operation: 'create' | 'update' | 'delete',
  data: any,
) => void;

// Storage keys
const STORAGE_KEYS = {
  USER_PROFILE: '@user_profile',
  USER_SETTINGS: '@user_settings',
  ACTIVITIES: '@activities',
  GOALS: '@goals',
  ACTIVITY_PREFIX: '@activity_',
  INSTALL_ID: '@install_id',
  APP_VERSION: '@app_version',
  // Auth / sync keys
  STORAGE_MODE: '@storage_mode',
  USER_ID: '@user_id',
} as const;

class StorageService {
  // ── Storage mode state ───────────────────────────────────────────────────

  private _storageMode: StorageMode = 'local-only';
  private _userId: string | null = null;
  private _syncCallback: SyncCallback | null = null;
  /** When true, notifySync() is suppressed (used during bulk import/download). */
  private _syncSuppressed = false;

  // ==================== App Initialization ====================

  /**
   * Initialize storage.
   * Call this on app startup — also restores the persisted storage mode.
   */
  async initialize(): Promise<void> {
    try {
      // Restore persisted storage mode
      const mode = await AsyncStorage.getItem(STORAGE_KEYS.STORAGE_MODE);
      if (mode === 'cloud-sync' || mode === 'local-only') {
        this._storageMode = mode;
      }

      const userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      if (userId) {
        this._userId = userId;
      }

      console.log(`Storage initialized (mode: ${this._storageMode})`);
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  // ==================== Storage Mode Management ====================

  /**
   * Return the current storage mode.
   */
  getStorageMode(): StorageMode {
    return this._storageMode;
  }

  /**
   * Persist and apply a new storage mode.
   */
  async setStorageMode(mode: StorageMode): Promise<void> {
    this._storageMode = mode;
    await AsyncStorage.setItem(STORAGE_KEYS.STORAGE_MODE, mode);
  }

  /**
   * Enable cloud sync for a given user.
   * Preserves all existing local data (Req 4.5, 6.4).
   */
  async enableCloudSync(userId: string): Promise<void> {
    this._userId = userId;
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
    await this.setStorageMode('cloud-sync');
  }

  /**
   * Disable cloud sync — revert to local-only.
   * Existing local data is preserved (Req 4.5).
   */
  async disableCloudSync(): Promise<void> {
    this._userId = null;
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_ID);
    await this.setStorageMode('local-only');
  }

  /**
   * Return the authenticated user ID (if any).
   */
  getUserId(): string | null {
    return this._userId;
  }

  /**
   * Register a callback that will be invoked on every write operation
   * while in cloud-sync mode. The SyncService will use this to push
   * changes to Supabase.
   */
  registerSyncCallback(callback: SyncCallback | null): void {
    this._syncCallback = callback;
  }

  /**
   * Notify the sync callback (if registered and in cloud-sync mode).
   */
  private notifySync(
    entityType: 'activity' | 'profile' | 'goal',
    operation: 'create' | 'update' | 'delete',
    data: any,
  ): void {
    if (this._syncSuppressed) return;
    if (this._storageMode === 'cloud-sync' && this._syncCallback) {
      try {
        this._syncCallback(entityType, operation, data);
      } catch (err) {
        console.error('Sync callback error (non-blocking):', err);
      }
    }
  }

  /**
   * Temporarily suppress sync notifications (e.g. during bulk import or
   * when downloading cloud data to avoid re-uploading the same items).
   */
  suppressSync(): void {
    this._syncSuppressed = true;
  }

  /**
   * Re-enable sync notifications after a suppressSync() call.
   */
  resumeSync(): void {
    this._syncSuppressed = false;
  }

  // ==================== Activities ====================

  /**
   * Save an activity to local storage
   */
  async saveActivity(activity: Activity): Promise<void> {
    try {
      // Single read of the activity list
      const activitiesJson = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      const existingActivities: Activity[] = activitiesJson ? JSON.parse(activitiesJson) : [];

      const existingIndex = existingActivities.findIndex(a => a.id === activity.id);
      const isUpdate = existingIndex >= 0;

      // Save individual activity
      const activityKey = `${STORAGE_KEYS.ACTIVITY_PREFIX}${activity.id}`;
      await AsyncStorage.setItem(activityKey, JSON.stringify(activity));

      // Update activities list
      if (isUpdate) {
        existingActivities[existingIndex] = activity;
      } else {
        existingActivities.push(activity);
      }

      // Sort by startTime descending (newest first)
      existingActivities.sort((a, b) => b.startTime - a.startTime);

      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(existingActivities));

      // Notify sync service if in cloud-sync mode
      this.notifySync('activity', isUpdate ? 'update' : 'create', activity);
    } catch (error) {
      console.error('Error saving activity:', error);
      throw new Error('Failed to save activity');
    }
  }

  /**
   * Get activities with optional filters
   */
  async getActivities(filters?: ActivityFilters): Promise<Activity[]> {
    try {
      const activitiesJson = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      let activities: Activity[] = activitiesJson ? JSON.parse(activitiesJson) : [];

      // Apply filters
      if (filters) {
        if (filters.startDate) {
          activities = activities.filter(a => a.startTime >= filters.startDate!);
        }
        if (filters.endDate) {
          activities = activities.filter(a => a.startTime <= filters.endDate!);
        }
        if (filters.type) {
          activities = activities.filter(a => a.type === filters.type);
        }
        if (filters.limit) {
          activities = activities.slice(0, filters.limit);
        }
      }

      return activities;
    } catch (error) {
      console.error('Error getting activities:', error);
      return [];
    }
  }

  /**
   * Get a single activity by ID
   */
  async getActivity(activityId: string): Promise<Activity | null> {
    try {
      const activityKey = `${STORAGE_KEYS.ACTIVITY_PREFIX}${activityId}`;
      const activityJson = await AsyncStorage.getItem(activityKey);
      return activityJson ? JSON.parse(activityJson) : null;
    } catch (error) {
      console.error('Error getting activity:', error);
      return null;
    }
  }

  /**
   * Delete an activity
   */
  async deleteActivity(activityId: string): Promise<void> {
    try {
      // Remove individual activity file
      const activityKey = `${STORAGE_KEYS.ACTIVITY_PREFIX}${activityId}`;
      await AsyncStorage.removeItem(activityKey);

      // Update activities list - remove from the list completely
      const activities = await this.getActivities();
      const filteredActivities = activities.filter(a => a.id !== activityId);
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(filteredActivities));
      
      console.log(`Activity ${activityId} permanently deleted`);

      // Notify sync service if in cloud-sync mode
      this.notifySync('activity', 'delete', { id: activityId });
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw new Error('Failed to delete activity');
    }
  }

  /**
   * Clear all activities
   */
  async clearAllActivities(): Promise<void> {
    try {
      // Get all activity keys
      const activities = await this.getActivities();
      const activityKeys = activities.map(a => `${STORAGE_KEYS.ACTIVITY_PREFIX}${a.id}`);

      // Remove all individual activities
      await AsyncStorage.multiRemove(activityKeys);

      // Clear activities list
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVITIES);
    } catch (error) {
      console.error('Error clearing activities:', error);
      throw new Error('Failed to clear activities');
    }
  }

  // ==================== User Profile ====================

  /**
   * Save user profile
   */
  async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));

      // Notify sync service if in cloud-sync mode
      this.notifySync('profile', 'update', profile);
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw new Error('Failed to save user profile');
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const profileJson = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return profileJson ? JSON.parse(profileJson) : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // ==================== Settings ====================

  /**
   * Save user settings
   */
  async saveSettings(settings: UserSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  /**
   * Get user settings
   */
  async getSettings(): Promise<UserSettings | null> {
    try {
      const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
      return settingsJson ? JSON.parse(settingsJson) : null;
    } catch (error) {
      console.error('Error getting settings:', error);
      return null;
    }
  }

  // ==================== Goals ====================

  /**
   * Save a goal
   */
  async saveGoal(goal: Goal): Promise<void> {
    try {
      const goals = await this.getGoals();
      const existingIndex = goals.findIndex(g => g.id === goal.id);
      const isUpdate = existingIndex >= 0;

      if (isUpdate) {
        goals[existingIndex] = goal;
      } else {
        goals.push(goal);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));

      // Notify sync service if in cloud-sync mode
      this.notifySync('goal', isUpdate ? 'update' : 'create', goal);
    } catch (error) {
      console.error('Error saving goal:', error);
      throw new Error('Failed to save goal');
    }
  }

  /**
   * Get all goals
   */
  async getGoals(): Promise<Goal[]> {
    try {
      const goalsJson = await AsyncStorage.getItem(STORAGE_KEYS.GOALS);
      return goalsJson ? JSON.parse(goalsJson) : [];
    } catch (error) {
      console.error('Error getting goals:', error);
      return [];
    }
  }

  /**
   * Update a goal
   */
  async updateGoal(goalId: string, updates: Partial<Goal>): Promise<void> {
    try {
      const goals = await this.getGoals();
      const goalIndex = goals.findIndex(g => g.id === goalId);

      if (goalIndex === -1) {
        throw new Error('Goal not found');
      }

      goals[goalIndex] = { ...goals[goalIndex], ...updates };
      await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));

      // Notify sync service if in cloud-sync mode
      this.notifySync('goal', 'update', goals[goalIndex]);
    } catch (error) {
      console.error('Error updating goal:', error);
      throw new Error('Failed to update goal');
    }
  }

  /**
   * Delete a goal
   */
  async deleteGoal(goalId: string): Promise<void> {
    try {
      const goals = await this.getGoals();
      const filteredGoals = goals.filter(g => g.id !== goalId);
      await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(filteredGoals));

      // Notify sync service if in cloud-sync mode
      this.notifySync('goal', 'delete', { id: goalId });
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw new Error('Failed to delete goal');
    }
  }

  // ==================== Statistics ====================

  /**
   * Calculate statistics for a given period
   */
  async getStatistics(period: StatsPeriod): Promise<Statistics> {
    try {
      const activities = await this.getActivitiesForPeriod(period);

      const totalDistance = activities.reduce((sum, a) => sum + a.distance, 0);
      const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0);
      const totalSteps = activities.reduce((sum, a) => sum + a.steps, 0);
      const totalCalories = activities.reduce((sum, a) => sum + a.calories, 0);
      const averagePace = activities.length > 0
        ? activities.reduce((sum, a) => sum + a.averagePace, 0) / activities.length
        : 0;

      const personalRecords = await this.calculatePersonalRecords(activities);

      return {
        period,
        totalDistance,
        totalDuration,
        totalActivities: activities.length,
        totalSteps,
        totalCalories,
        averagePace,
        personalRecords,
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw new Error('Failed to get statistics');
    }
  }

  /**
   * Get activities for a specific period
   */
  private async getActivitiesForPeriod(period: StatsPeriod): Promise<Activity[]> {
    const now = Date.now();
    let startDate: number;

    switch (period) {
      case 'week':
        startDate = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        startDate = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case 'allTime':
        return this.getActivities();
      default:
        return [];
    }

    return this.getActivities({ startDate });
  }

  /**
   * Calculate personal records from activities
   * Uses PersonalRecordsService for consistent record calculation
   */
  private async calculatePersonalRecords(activities: Activity[]): Promise<PersonalRecords> {
    return personalRecordsService.calculatePersonalRecords(activities);
  }

  /**
   * Get personal records for all time
   */
  async getPersonalRecords(): Promise<PersonalRecords> {
    const activities = await this.getActivities();
    return personalRecordsService.getAllTimeRecords(activities);
  }

  /**
   * Check if a new activity breaks any personal records
   * @param activityId - ID of the newly saved activity
   * @returns Information about broken records
   */
  async checkForNewRecords(activityId: string): Promise<{
    hasNewRecords: boolean;
    brokenRecords: Array<{
      type: 'distance' | 'pace' | 'duration' | 'steps';
      oldValue: number;
      newValue: number;
    }>;
  }> {
    try {
      const newActivity = await this.getActivity(activityId);
      if (!newActivity) {
        return { hasNewRecords: false, brokenRecords: [] };
      }

      // Get all activities except the new one
      const allActivities = await this.getActivities();
      const previousActivities = allActivities.filter(a => a.id !== activityId);

      // Calculate previous records
      const previousRecords = personalRecordsService.calculatePersonalRecords(previousActivities);

      // Check if new activity breaks any records
      return personalRecordsService.checkForNewRecords(newActivity, previousRecords);
    } catch (error) {
      console.error('Error checking for new records:', error);
      return { hasNewRecords: false, brokenRecords: [] };
    }
  }

  // ==================== Data Export/Import ====================

  /**
   * Export all data as JSON
   */
  async exportData(): Promise<string> {
    try {
      const [profile, settings, activities, goals] = await Promise.all([
        this.getUserProfile(),
        this.getSettings(),
        this.getActivities(),
        this.getGoals(),
      ]);

      const exportData = {
        version: '1.0.0',
        exportDate: Date.now(),
        profile,
        settings,
        activities,
        goals,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('Failed to export data');
    }
  }

  /**
   * Import data from JSON
   */
  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);

      // Validate data structure
      if (!data.version || !data.exportDate) {
        throw new Error('Invalid data format');
      }

      // Suppress sync during bulk import to avoid N individual callbacks.
      // A full sync should be triggered after import completes.
      this.suppressSync();

      try {
        // Import profile
        if (data.profile) {
          await this.saveUserProfile(data.profile);
        }

        // Import settings
        if (data.settings) {
          await this.saveSettings(data.settings);
        }

        // Import activities
        if (data.activities && Array.isArray(data.activities)) {
          for (const activity of data.activities) {
            await this.saveActivity(activity);
          }
        }

        // Import goals
        if (data.goals && Array.isArray(data.goals)) {
          for (const goal of data.goals) {
            await this.saveGoal(goal);
          }
        }
      } finally {
        this.resumeSync();
      }
    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error('Failed to import data');
    }
  }

  /**
   * Clear all data (for logout or reset)
   */
  async clearAllData(): Promise<void> {
    try {
      // Get all app-related keys
      const allKeys = await AsyncStorage.getAllKeys();
      const appKeys = allKeys.filter(key => key.startsWith('@'));
      
      if (appKeys.length > 0) {
        await AsyncStorage.multiRemove(appKeys);
      }
      
      console.log('All data cleared');
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw new Error('Failed to clear all data');
    }
  }

  /**
   * Get storage usage information
   */
  async getStorageInfo(): Promise<{ keys: number; estimatedSize: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter(key => key.startsWith('@'));

      // Batch read all values in one call for performance
      let estimatedSize = 0;
      if (appKeys.length > 0) {
        const entries = await AsyncStorage.multiGet(appKeys);
        for (const [, value] of entries) {
          if (value) {
            estimatedSize += value.length;
          }
        }
      }

      return {
        keys: appKeys.length,
        estimatedSize, // in bytes (string length ≈ bytes for ASCII)
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { keys: 0, estimatedSize: 0 };
    }
  }
}

// Export singleton instance
export default new StorageService();
