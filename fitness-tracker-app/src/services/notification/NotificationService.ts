/**
 * Notification Service
 * 
 * Manages notifications for activity tracking:
 * - Permission handling
 * - Persistent notification during active sessions
 * - Real-time metric updates
 * - Notification controls (pause, resume, stop)
 * - Background notification updates
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ActivityMetrics, UnitSystem } from '@/types';
import { formatDistance, formatDuration, formatPace } from '@/utils/formatting';

// Notification channel ID for Android
const ACTIVITY_CHANNEL_ID = 'activity-tracking';
const ACTIVITY_NOTIFICATION_IDENTIFIER = 'activity-tracking-notification';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  private hasPermission: boolean = false;
  private currentNotificationId: string | null = null;
  private lastNotificationUpdate: number = 0;
  private readonly NOTIFICATION_UPDATE_INTERVAL = 5000; // Update every 5 seconds

  /**
   * Initialize the notification service
   * Sets up notification channels for Android
   */
  async initialize(): Promise<void> {
    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ACTIVITY_CHANNEL_ID, {
        name: 'Activity Tracking',
        importance: Notifications.AndroidImportance.LOW, // Low to avoid sound/vibration on updates
        vibrationPattern: [0],
        lightColor: '#6C63FF',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        description: 'Shows your current activity progress',
        enableVibrate: false,
        showBadge: false,
      });
    }
  }

  /**
   * Request notification permissions
   * 
   * @returns Promise resolving to true if permission granted
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      this.hasPermission = finalStatus === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      this.hasPermission = false;
      return false;
    }
  }

  /**
   * Check if notification permissions are granted
   * 
   * @returns Promise resolving to true if permission granted
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  /**
   * Show persistent notification for active activity session
   * 
   * @param metrics - Current activity metrics
   * @param activityType - Type of activity (walking/running)
   * @param units - Unit system for formatting
   * @param isPaused - Whether activity is paused
   */
  async showActivityNotification(
    metrics: ActivityMetrics,
    activityType: 'activity',
    units: UnitSystem = 'metric',
    isPaused: boolean = false
  ): Promise<void> {
    if (!this.hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) {
        console.warn('Notification permission not granted');
        return;
      }
    }

    try {
      const title = isPaused 
        ? 'Activity Paused'
        : 'Activity in Progress';

      const body = this.formatMetricsForNotification(metrics, units);

      // Use a fixed identifier to update the same notification
      await Notifications.scheduleNotificationAsync({
        identifier: ACTIVITY_NOTIFICATION_IDENTIFIER,
        content: {
          title,
          body,
          data: {
            type: 'activity-tracking',
            activityType,
            isPaused,
          },
          sticky: true, // Cannot be swiped away
          priority: Notifications.AndroidNotificationPriority.LOW, // Low priority to avoid sound
          sound: false,
          badge: 0,
          color: '#6C63FF', // App primary color
        },
        trigger: null, // Show immediately
      });

      this.currentNotificationId = ACTIVITY_NOTIFICATION_IDENTIFIER;
    } catch (error) {
      console.error('Error showing activity notification:', error);
    }
  }

  /**
   * Update existing activity notification with new metrics
   * Throttled to avoid excessive updates
   * 
   * @param metrics - Updated activity metrics
   * @param activityType - Type of activity (walking/running)
   * @param units - Unit system for formatting
   * @param isPaused - Whether activity is paused
   */
  async updateActivityNotification(
    metrics: ActivityMetrics,
    activityType: 'activity',
    units: UnitSystem = 'metric',
    isPaused: boolean = false
  ): Promise<void> {
    const now = Date.now();
    
    // Throttle updates - only update every 1 second to match the timer tick
    if (now - this.lastNotificationUpdate < 1000) {
      return;
    }
    
    this.lastNotificationUpdate = now;
    await this.showActivityNotification(metrics, activityType, units, isPaused);
  }

  /**
   * Dismiss the activity notification
   */
  async dismissActivityNotification(): Promise<void> {
    try {
      // Dismiss by identifier
      await Notifications.dismissNotificationAsync(ACTIVITY_NOTIFICATION_IDENTIFIER);
      
      // Also dismiss all notifications to be safe
      await Notifications.dismissAllNotificationsAsync();
      
      this.currentNotificationId = null;
      this.lastNotificationUpdate = 0;
      
      console.log('Activity notification dismissed');
    } catch (error) {
      console.error('Error dismissing activity notification:', error);
    }
  }

  /**
   * Show distance milestone announcement notification
   * 
   * @param distance - Distance achieved in meters
   * @param pace - Current pace in seconds per km
   * @param units - Unit system for formatting
   */
  async showDistanceAnnouncement(
    distance: number,
    pace: number,
    units: UnitSystem = 'metric'
  ): Promise<void> {
    if (!this.hasPermission) {
      return;
    }

    try {
      const distanceStr = formatDistance(distance, units, 1);
      const paceStr = formatPace(pace, units);

      await Notifications.scheduleNotificationAsync({
        identifier: 'distance-milestone-notification',
        content: {
          title: 'Distance Milestone',
          body: `${distanceStr} completed at ${paceStr}`,
          data: {
            type: 'distance-announcement',
            distance,
            pace,
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error showing distance announcement:', error);
    }
  }

  /**
   * Show goal achievement notification
   * 
   * @param goalTitle - Title of the achieved goal
   * @param goalDescription - Description of the goal
   */
  async showGoalAchievement(
    goalTitle: string,
    goalDescription: string
  ): Promise<void> {
    if (!this.hasPermission) {
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏆 Goal Achieved!',
          body: `${goalTitle}: ${goalDescription}`,
          data: {
            type: 'goal-achievement',
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error showing goal achievement notification:', error);
    }
  }

  /**
   * Show activity completion notification
   * 
   * @param metrics - Final activity metrics
   * @param activityType - Type of activity
   * @param units - Unit system for formatting
   */
  async showActivityCompletion(
    metrics: ActivityMetrics,
    activityType: 'activity',
    units: UnitSystem = 'metric'
  ): Promise<void> {
    if (!this.hasPermission) {
      return;
    }

    try {
      const distance = formatDistance(metrics.distance, units, 2);
      const duration = formatDuration(metrics.duration);
      const pace = formatPace(metrics.averagePace, units);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Activity Complete!',
          body: `${distance} in ${duration} at ${pace}`,
          data: {
            type: 'activity-completion',
            activityType,
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error showing activity completion notification:', error);
    }
  }

  /**
   * Format metrics for notification body
   * 
   * @param metrics - Activity metrics
   * @param units - Unit system for formatting
   * @returns Formatted string for notification body
   */
  private formatMetricsForNotification(
    metrics: ActivityMetrics,
    units: UnitSystem
  ): string {
    const duration = formatDuration(metrics.duration);
    const distance = formatDistance(metrics.distance, units, 2);
    const pace = formatPace(metrics.averagePace, units);

    return `${duration} • ${distance} • Avg Pace: ${pace}`;
  }

  /**
   * Set up notification categories with actions (iOS)
   * Note: Actions require native build and won't work in Expo Go
   */
  async setupNotificationCategories(): Promise<void> {
    if (Platform.OS === 'ios') {
      try {
        await Notifications.setNotificationCategoryAsync('activity-controls', [
          {
            identifier: 'pause',
            buttonTitle: 'Pause',
            options: {
              opensAppToForeground: false,
            },
          },
          {
            identifier: 'stop',
            buttonTitle: 'Stop',
            options: {
              opensAppToForeground: true,
            },
          },
        ]);
      } catch (error) {
        console.error('Error setting up notification categories:', error);
      }
    }
  }

  /**
   * Add notification response listener
   * Handles user interactions with notifications
   * 
   * @param callback - Callback function to handle notification responses
   * @returns Subscription object
   */
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Add notification received listener
   * Handles notifications received while app is in foreground
   * 
   * @param callback - Callback function to handle received notifications
   * @returns Subscription object
   */
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications
   * 
   * @returns Array of scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;
