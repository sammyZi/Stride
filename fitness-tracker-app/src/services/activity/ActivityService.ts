/**
 * ActivityService - Manages activity tracking lifecycle and metrics
 * 
 * Features:
 * - Activity lifecycle management (start, pause, resume, stop)
 * - Real-time metrics calculation (distance, pace, duration, steps)
 * - Route point collection and storage
 * - Activity state management
 * - Integration with LocationService and StorageService
 */

// Simple UUID generator for React Native
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
import {
  Activity,
  ActivityType,
  ActivityMetrics,
  RoutePoint,
  Location,
} from '@/types';
import locationService from '../location/LocationService';
import storageService from '../storage/StorageService';
import stepCounterService from '../stepCounter/StepCounterService';
import notificationService from '../notification/NotificationService';
import goalsService from '../goals/GoalsService';

interface ActiveActivity {
  id: string;
  type: ActivityType;
  startTime: number;
  pausedTime: number; // Total time spent paused
  lastPauseTime: number | null; // When the activity was last paused
  route: RoutePoint[];
  steps: number;
  status: 'active' | 'paused';
}

class ActivityService {
  private currentActivity: ActiveActivity | null = null;
  private locationUnsubscribe: (() => void) | null = null;
  private stepCounterUnsubscribe: (() => void) | null = null;
  private metricsUpdateCallbacks: Array<(metrics: ActivityMetrics) => void> = [];
  private metricsUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private lastMetricsUpdate: number = 0;
  private readonly METRICS_UPDATE_INTERVAL = 1000; // Update metrics every second
  private cachedCalories: number = 0; // Cached calorie value for current activity

  /**
   * Start a new activity
   * @param type - Activity type (always 'activity')
   * @param enableBackground - Enable background location tracking
   * @returns Activity ID
   */
  async startActivity(type: ActivityType, enableBackground: boolean = true): Promise<string> {
    console.log('=== START ACTIVITY CALLED ===', { type, enableBackground });

    if (this.currentActivity) {
      console.error('Activity already in progress!');
      throw new Error('An activity is already in progress');
    }

    try {
      const activityId = generateUUID();
      const startTime = Date.now();
      console.log('Generated activity ID:', activityId);

      // Initialize activity
      this.currentActivity = {
        id: activityId,
        type,
        startTime,
        pausedTime: 0,
        lastPauseTime: null,
        route: [],
        steps: 0,
        status: 'active',
      };
      this.cachedCalories = 0; // Reset cached calories for new activity
      console.log('Activity object created, status:', this.currentActivity.status);

      // Start location tracking
      console.log('Starting location tracking...');
      await locationService.startTracking(enableBackground);
      console.log('Location tracking started successfully');

      // Subscribe to location updates
      console.log('Subscribing to location updates...');
      this.locationUnsubscribe = locationService.onLocationUpdate((location) => {
        this.handleLocationUpdate(location);
      });
      console.log('Location subscription set up');

      // Start step counting if available
      try {
        const stepCounterAvailable = await stepCounterService.isAvailable();
        if (stepCounterAvailable) {
          await stepCounterService.startCounting();

          // Subscribe to step updates
          this.stepCounterUnsubscribe = stepCounterService.onStepUpdate((steps) => {
            this.updateSteps(steps);
          });

          console.log('Step counting started');
        } else {
          console.log('Step counter not available on this device');
        }
      } catch (error) {
        console.error('Error starting step counter:', error);
        // Continue without step counting
      }

      console.log(`Activity started: ${activityId} (${type})`);

      // Show initial notification
      const initialMetrics = this.calculateMetrics();
      await notificationService.showActivityNotification(
        initialMetrics,
        type,
        'metric',
        false
      );

      // Start metrics update loop
      this.startMetricsUpdateLoop();

      return activityId;
    } catch (error) {
      console.error('!!! ERROR IN START ACTIVITY !!!', error);
      this.currentActivity = null;
      throw error;
    }
  }

  /**
   * Pause the current activity
   */
  async pauseActivity(): Promise<void> {
    console.log('pauseActivity called, currentActivity:', !!this.currentActivity);

    if (!this.currentActivity) {
      console.error('Cannot pause - no activity in progress!');
      throw new Error('No activity in progress');
    }

    if (this.currentActivity.status === 'paused') {
      console.warn('Activity is already paused');
      return;
    }

    console.log('Pausing activity, current status:', this.currentActivity.status);
    this.currentActivity.status = 'paused';
    this.currentActivity.lastPauseTime = Date.now();

    // Pause location tracking
    locationService.pauseTracking();

    // Pause step counting (pedometer continues in background)
    if (stepCounterService.isCurrentlyCounting()) {
      stepCounterService.pauseCounting();
    }

    console.log('Activity paused successfully');

    // Notify subscribers with current metrics
    this.notifyMetricsUpdate();
  }

  /**
   * Resume the current activity
   */
  async resumeActivity(): Promise<void> {
    if (!this.currentActivity) {
      throw new Error('No activity in progress');
    }

    if (this.currentActivity.status === 'active') {
      console.warn('Activity is already active');
      return;
    }

    // Calculate paused duration
    if (this.currentActivity.lastPauseTime) {
      const pauseDuration = Date.now() - this.currentActivity.lastPauseTime;
      this.currentActivity.pausedTime += pauseDuration;
      this.currentActivity.lastPauseTime = null;
    }

    this.currentActivity.status = 'active';

    // Resume location tracking
    locationService.resumeTracking();

    // Resume step counting
    if (stepCounterService.isCurrentlyCounting()) {
      stepCounterService.resumeCounting();
    }

    console.log('Activity resumed');

    // Notify subscribers with current metrics
    this.notifyMetricsUpdate();
  }

  /**
   * Stop the current activity and save it
   * @returns Completed activity
   */
  async stopActivity(): Promise<Activity> {
    if (!this.currentActivity) {
      throw new Error('No activity in progress');
    }

    try {
      const endTime = Date.now();

      // If activity is paused, add the final pause duration
      if (this.currentActivity.status === 'paused' && this.currentActivity.lastPauseTime) {
        const pauseDuration = endTime - this.currentActivity.lastPauseTime;
        this.currentActivity.pausedTime += pauseDuration;
      }

      // Calculate final metrics
      const metrics = this.calculateMetrics();
      const totalDuration = Math.floor((endTime - this.currentActivity.startTime - this.currentActivity.pausedTime) / 1000);

      // Calculate final calories with accurate duration
      const finalCalories = await this.calculateCalories(metrics.distance, totalDuration);

      // Create completed activity
      const completedActivity: Activity = {
        id: this.currentActivity.id,
        type: this.currentActivity.type,
        startTime: this.currentActivity.startTime,
        endTime,
        duration: totalDuration,
        distance: metrics.distance,
        steps: this.currentActivity.steps,
        route: this.currentActivity.route,
        averagePace: metrics.averagePace,
        maxPace: this.calculateMaxPace(),
        calories: finalCalories,
        elevationGain: this.calculateElevationGain(),
        status: 'completed',
        createdAt: Date.now(),
      };

      // Save activity to storage
      await storageService.saveActivity(completedActivity);

      // Check for goal achievements
      try {
        const achievedGoals = await goalsService.checkGoalAchievements(completedActivity.id);
        if (achievedGoals.length > 0) {
          console.log('Goals achieved:', achievedGoals.length);
          // Goals will be displayed in the UI through the goals hook
        }
      } catch (error) {
        console.error('Error checking goal achievements:', error);
        // Don't fail the activity save if goal check fails
      }

      // Stop location tracking
      await locationService.stopTracking();

      // Unsubscribe from location updates
      if (this.locationUnsubscribe) {
        this.locationUnsubscribe();
        this.locationUnsubscribe = null;
      }

      // Stop step counting and unsubscribe
      if (stepCounterService.isCurrentlyCounting()) {
        await stepCounterService.stopCounting();
      }

      if (this.stepCounterUnsubscribe) {
        this.stepCounterUnsubscribe();
        this.stepCounterUnsubscribe = null;
      }

      // Clear current activity FIRST to stop interval callbacks
      const activity = completedActivity;
      this.currentActivity = null;

      // Clear metrics update interval
      if (this.metricsUpdateInterval) {
        clearInterval(this.metricsUpdateInterval);
        this.metricsUpdateInterval = null;
      }

      // Clear all callbacks
      this.metricsUpdateCallbacks = [];

      // Dismiss notification
      await notificationService.dismissActivityNotification();

      console.log('Activity stopped and saved:', activity.id);

      return activity;
    } catch (error) {
      console.error('Error stopping activity:', error);
      throw error;
    }
  }

  /**
   * Discard the current activity without saving
   */
  async discardActivity(): Promise<void> {
    if (!this.currentActivity) {
      throw new Error('No activity in progress');
    }

    try {
      console.log('Discarding activity:', this.currentActivity.id);

      // Stop location tracking
      await locationService.stopTracking();

      // Unsubscribe from location updates
      if (this.locationUnsubscribe) {
        this.locationUnsubscribe();
        this.locationUnsubscribe = null;
      }

      // Stop step counting and unsubscribe
      if (stepCounterService.isCurrentlyCounting()) {
        await stepCounterService.stopCounting();
      }

      if (this.stepCounterUnsubscribe) {
        this.stepCounterUnsubscribe();
        this.stepCounterUnsubscribe = null;
      }

      // Clear current activity FIRST to stop interval callbacks
      this.currentActivity = null;

      // Clear metrics update interval
      if (this.metricsUpdateInterval) {
        clearInterval(this.metricsUpdateInterval);
        this.metricsUpdateInterval = null;
      }

      // Clear all callbacks
      this.metricsUpdateCallbacks = [];

      // Dismiss notification
      await notificationService.dismissActivityNotification();

      console.log('Activity discarded successfully');
    } catch (error) {
      console.error('Error discarding activity:', error);
      throw error;
    }
  }

  /**
   * Get the current active activity
   */
  getCurrentActivity(): ActiveActivity | null {
    return this.currentActivity;
  }

  /**
   * Get current activity metrics
   */
  getCurrentMetrics(): ActivityMetrics {
    if (!this.currentActivity) {
      return {
        currentPace: 0,
        averagePace: 0,
        distance: 0,
        duration: 0,
        steps: 0,
        calories: 0,
      };
    }

    return this.calculateMetrics();
  }

  /**
   * Update step count for current activity
   * @param steps - Current step count
   */
  updateSteps(steps: number): void {
    if (this.currentActivity) {
      this.currentActivity.steps = steps;
    }
  }

  /**
   * Subscribe to metrics updates
   * @param callback - Function to call when metrics update
   * @returns Unsubscribe function
   */
  onMetricsUpdate(callback: (metrics: ActivityMetrics) => void): () => void {
    this.metricsUpdateCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      this.metricsUpdateCallbacks = this.metricsUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Check if an activity is currently in progress
   */
  isActivityInProgress(): boolean {
    return this.currentActivity !== null;
  }

  /**
   * Check if current activity is paused
   */
  isActivityPaused(): boolean {
    return this.currentActivity?.status === 'paused' || false;
  }

  /**
   * Handle incoming location updates
   */
  private handleLocationUpdate(location: Location): void {
    if (!this.currentActivity || this.currentActivity.status === 'paused') {
      return;
    }

    // Filter out low-accuracy GPS points (>50m accuracy causes phantom distance)
    if (location.accuracy > 50) {
      console.log('Skipping low-accuracy GPS point:', location.accuracy, 'm');
      return;
    }

    // Add location to route
    const routePoint: RoutePoint = {
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: location.altitude || undefined,
      timestamp: location.timestamp,
      accuracy: location.accuracy,
    };

    this.currentActivity.route.push(routePoint);

    // Throttle metrics updates to avoid excessive calculations
    const now = Date.now();
    if (now - this.lastMetricsUpdate >= this.METRICS_UPDATE_INTERVAL) {
      this.notifyMetricsUpdate();
      this.lastMetricsUpdate = now;
    }
  }

  /**
   * Start the metrics update loop for duration updates
   */
  private startMetricsUpdateLoop(): void {
    // Clear any existing interval
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
      this.metricsUpdateInterval = null;
    }

    this.metricsUpdateInterval = setInterval(() => {
      if (!this.currentActivity) {
        if (this.metricsUpdateInterval) {
          clearInterval(this.metricsUpdateInterval);
          this.metricsUpdateInterval = null;
        }
        return;
      }

      // Only update if activity is active (not paused)
      if (this.currentActivity.status === 'active') {
        this.notifyMetricsUpdate();
      }
    }, this.METRICS_UPDATE_INTERVAL);

    console.log('Metrics update loop started');
  }

  /**
   * Notify all subscribers of metrics update
   */
  private notifyMetricsUpdate(): void {
    if (!this.currentActivity) return;

    const metrics = this.calculateMetrics();

    // Update notification with current metrics
    notificationService.updateActivityNotification(
      metrics,
      this.currentActivity.type,
      'metric',
      this.currentActivity.status === 'paused'
    ).catch(err => console.error('Error updating notification:', err));

    this.metricsUpdateCallbacks.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.error('Error in metrics update callback:', error);
      }
    });
  }

  /**
   * Calculate current activity metrics
   * Note: Calories are calculated asynchronously and cached
   */
  private calculateMetrics(): ActivityMetrics {
    if (!this.currentActivity) {
      return {
        currentPace: 0,
        averagePace: 0,
        distance: 0,
        duration: 0,
        steps: 0,
        calories: 0,
      };
    }

    const distance = this.calculateTotalDistance();
    const duration = this.calculateActiveDuration();
    const averagePace = this.calculateAveragePace(distance, duration);
    const currentPace = this.calculateCurrentPace();

    // Calculate calories asynchronously and update cached value
    this.calculateCalories(distance, duration).then(calories => {
      if (this.currentActivity) {
        this.cachedCalories = calories;
      }
    }).catch(err => console.error('Error calculating calories:', err));

    return {
      currentPace,
      averagePace,
      distance,
      duration,
      steps: this.currentActivity.steps,
      calories: this.cachedCalories,
    };
  }

  /**
   * Calculate total distance from route points using Haversine formula
   * @returns Distance in meters
   */
  private calculateTotalDistance(): number {
    if (!this.currentActivity || this.currentActivity.route.length < 2) {
      return 0;
    }

    let totalDistance = 0;
    const route = this.currentActivity.route;

    for (let i = 1; i < route.length; i++) {
      const prev = route[i - 1];
      const curr = route[i];
      const segmentDistance = this.calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );

      // Spike filtering: skip segments where implied speed > 50 km/h
      // (unrealistic for walking/running, likely GPS jump)
      const timeDiffSec = (curr.timestamp - prev.timestamp) / 1000;
      if (timeDiffSec > 0) {
        const speedKmh = (segmentDistance / 1000) / (timeDiffSec / 3600);
        if (speedKmh > 50) {
          console.log('Skipping GPS spike: implied speed', speedKmh.toFixed(1), 'km/h');
          continue;
        }
      }

      totalDistance += segmentDistance;
    }

    return totalDistance;
  }

  /**
   * Calculate active duration (excluding paused time)
   * @returns Duration in seconds
   */
  private calculateActiveDuration(): number {
    if (!this.currentActivity) {
      return 0;
    }

    const now = Date.now();
    let totalTime = now - this.currentActivity.startTime;

    // Subtract paused time
    let pausedTime = this.currentActivity.pausedTime;

    // If currently paused, add current pause duration
    if (this.currentActivity.status === 'paused' && this.currentActivity.lastPauseTime) {
      pausedTime += now - this.currentActivity.lastPauseTime;
    }

    const activeDuration = totalTime - pausedTime;
    return Math.floor(activeDuration / 1000); // Convert to seconds
  }

  /**
   * Calculate average pace
   * @param distance - Distance in meters
   * @param duration - Duration in seconds
   * @returns Pace in seconds per kilometer
   */
  private calculateAveragePace(distance: number, duration: number): number {
    if (distance <= 0 || duration <= 0) {
      return 0;
    }

    const distanceKm = distance / 1000;
    const pace = duration / distanceKm; // seconds per km

    // Bounds check: return 0 for unrealistic paces
    // 90 sec/km (~1:30/km) to 3600 sec/km (~60:00/km)
    if (pace < 90 || pace > 3600 || !isFinite(pace)) {
      return 0;
    }

    return pace;
  }

  /**
   * Calculate current pace based on recent route points
   * Uses last 30 seconds of data for current pace
   * @returns Pace in seconds per kilometer
   */
  private calculateCurrentPace(): number {
    if (!this.currentActivity || this.currentActivity.route.length < 2) {
      return 0;
    }

    const now = Date.now();
    const timeWindow = 30000; // 30 seconds
    const route = this.currentActivity.route;

    // Find points within the time window
    const recentPoints = route.filter(point => now - point.timestamp <= timeWindow);

    if (recentPoints.length < 2) {
      return 0;
    }

    // Calculate distance covered in time window (with spike filtering)
    let distance = 0;
    for (let i = 1; i < recentPoints.length; i++) {
      const prev = recentPoints[i - 1];
      const curr = recentPoints[i];
      const segDist = this.calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );

      // Skip GPS spikes (implied speed > 50 km/h)
      const segTime = (curr.timestamp - prev.timestamp) / 1000;
      if (segTime > 0) {
        const speedKmh = (segDist / 1000) / (segTime / 3600);
        if (speedKmh > 50) continue;
      }

      distance += segDist;
    }

    // Calculate time span
    const timeSpan = (recentPoints[recentPoints.length - 1].timestamp - recentPoints[0].timestamp) / 1000;

    if (distance <= 0 || timeSpan <= 0) {
      return 0;
    }

    const distanceKm = distance / 1000;
    const pace = timeSpan / distanceKm; // seconds per km

    // Bounds check: return 0 for unrealistic current pace
    if (pace < 90 || pace > 3600 || !isFinite(pace)) {
      return 0;
    }

    return pace;
  }

  /**
   * Calculate maximum pace (fastest pace) from the activity
   * @returns Pace in seconds per kilometer
   */
  private calculateMaxPace(): number {
    if (!this.currentActivity || this.currentActivity.route.length < 2) {
      return 0;
    }

    const route = this.currentActivity.route;
    let maxPace = 0;
    const windowSize = 10; // Use 10 points for pace calculation

    for (let i = windowSize; i < route.length; i++) {
      const windowPoints = route.slice(i - windowSize, i);

      let distance = 0;
      for (let j = 1; j < windowPoints.length; j++) {
        const prev = windowPoints[j - 1];
        const curr = windowPoints[j];
        distance += this.calculateDistance(
          prev.latitude,
          prev.longitude,
          curr.latitude,
          curr.longitude
        );
      }

      const timeSpan = (windowPoints[windowPoints.length - 1].timestamp - windowPoints[0].timestamp) / 1000;

      if (distance > 0 && timeSpan > 0) {
        const distanceKm = distance / 1000;
        const pace = timeSpan / distanceKm;

        // Track fastest pace (lowest value)
        if (maxPace === 0 || pace < maxPace) {
          maxPace = pace;
        }
      }
    }

    return maxPace;
  }

  /**
   * Calculate calories burned
   * Uses MET (Metabolic Equivalent of Task) values based on activity type and speed
   * Fetches user weight from profile for accurate calculations
   * @param distance - Distance in meters
   * @param duration - Duration in seconds
   * @returns Estimated calories burned
   */
  private async calculateCalories(distance: number, duration: number): Promise<number> {
    if (!this.currentActivity || distance === 0 || duration === 0) {
      return 0;
    }

    // Get user weight from profile
    let weight = 70; // Default weight if not available (70kg)
    try {
      const profile = await storageService.getUserProfile();
      if (profile?.weight) {
        weight = profile.weight;
      }
    } catch (error) {
      console.log('Could not fetch user weight, using default:', error);
    }

    // Calculate speed in km/h
    const distanceKm = distance / 1000;
    const durationHours = duration / 3600;
    const speed = distanceKm / durationHours;

    // MET values based on speed (activity type is always 'activity')
    let met: number;

    // Determine activity intensity from speed
    if (speed < 3.2) {
      met = 2.5; // Slow walking
    } else if (speed < 4.8) {
      met = 3.5; // Moderate walking
    } else if (speed < 6.4) {
      met = 5.0; // Brisk walking
    } else if (speed < 8) {
      met = 7.0; // Very brisk walking / light jogging
    } else if (speed < 10) {
      met = 9.8; // Running (moderate)
    } else if (speed < 12) {
      met = 11.5; // Running (fast)
    } else {
      met = 13.5; // Running (very fast)
    }

    // Calories = MET * weight(kg) * duration(hours)
    const calories = met * weight * durationHours;

    return Math.round(calories);
  }

  /**
   * Calculate elevation gain from route
   * @returns Elevation gain in meters
   */
  private calculateElevationGain(): number | undefined {
    if (!this.currentActivity || this.currentActivity.route.length < 2) {
      return undefined;
    }

    let elevationGain = 0;
    const route = this.currentActivity.route;

    for (let i = 1; i < route.length; i++) {
      const prev = route[i - 1];
      const curr = route[i];

      // Only count positive elevation changes
      if (prev.altitude !== undefined && curr.altitude !== undefined) {
        const elevationChange = curr.altitude - prev.altitude;
        if (elevationChange > 0) {
          elevationGain += elevationChange;
        }
      }
    }

    return elevationGain > 0 ? elevationGain : undefined;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @returns Distance in meters
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
}

// Export singleton instance
export default new ActivityService();
