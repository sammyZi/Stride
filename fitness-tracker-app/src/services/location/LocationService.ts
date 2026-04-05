/**
 * LocationService - High-accuracy GPS tracking with Kalman filtering
 * 
 * Features:
 * - BestForNavigation accuracy mode
 * - Accuracy filtering (rejects points > 20m)
 * - Kalman filter for path smoothing
 * - GPS signal quality monitoring
 * - Speed and heading data capture
 * - Stationary point detection
 * - Background location tracking support
 */

import * as ExpoLocation from 'expo-location';
import { Location, AccuracyStatus, AccuracyQuality } from '@/types';
import { GPS_CONFIG } from '@/config/tracking';
import { calculateDistance } from '@/utils/calculations';
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  isBackgroundLocationTrackingActive,
  setBackgroundLocationCallback,
  clearBackgroundLocationCallback,
  resetBackgroundState,
} from './BackgroundLocationTask';
import batteryOptimizationService from '../battery/BatteryOptimizationService';

export type LocationUpdateCallback = (location: Location) => void;

interface KalmanState {
  latitude: number;
  longitude: number;
  variance: number;
}

class LocationService {
  private isTracking: boolean = false;
  private isPaused: boolean = false;
  private locationSubscription: ExpoLocation.LocationSubscription | null = null;
  private updateCallbacks: LocationUpdateCallback[] = [];
  private lastLocation: Location | null = null;
  private kalmanState: KalmanState | null = null;
  private useBackgroundTracking: boolean = false;

  /**
   * Request foreground location permissions from the user
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.warn('Foreground location permission denied');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Request background location permissions from the user
   * Must be called after foreground permissions are granted
   */
  async requestBackgroundPermissions(): Promise<boolean> {
    try {
      // Check if foreground permission is granted first
      const { status: foregroundStatus } = await ExpoLocation.getForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.warn('Foreground permission must be granted before requesting background permission');
        return false;
      }

      // Request background permission
      const { status: backgroundStatus } = await ExpoLocation.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission denied');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting background location permissions:', error);
      return false;
    }
  }

  /**
   * Check if background location permissions are granted
   */
  async hasBackgroundPermissions(): Promise<boolean> {
    try {
      const { status } = await ExpoLocation.getBackgroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking background location permissions:', error);
      return false;
    }
  }

  /**
   * Check if location permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await ExpoLocation.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permissions:', error);
      return false;
    }
  }

  /**
   * Start high-accuracy GPS tracking
   * @param enableBackground - Enable background location tracking (default: true)
   */
  async startTracking(enableBackground: boolean = true): Promise<void> {
    if (this.isTracking) {
      console.warn('Location tracking already started');
      return;
    }

    // Check foreground permissions
    const hasForegroundPermission = await this.hasPermissions();
    if (!hasForegroundPermission) {
      throw new Error('Foreground location permissions not granted');
    }

    // Check background permissions if background tracking is requested
    if (enableBackground) {
      const hasBackgroundPermission = await this.hasBackgroundPermissions();
      if (!hasBackgroundPermission) {
        throw new Error('Background location permissions not granted. Please enable "Always" location access in settings.');
      }

      // Check battery optimization before starting background tracking
      const batteryExempted = await batteryOptimizationService.checkBeforeTracking();
      if (!batteryExempted) {
        console.warn('Battery optimization is enabled, tracking may be interrupted');
        // Continue anyway, but user has been warned
      }
    }

    try {
      this.useBackgroundTracking = enableBackground;

      if (enableBackground) {
        // Use background location tracking for continuous tracking
        await this.startBackgroundTracking();
      } else {
        // Use foreground-only tracking
        await this.startForegroundTracking();
      }

      this.isTracking = true;
      this.isPaused = false;
      this.kalmanState = null; // Reset Kalman filter
      console.log(`Location tracking started with high accuracy (background: ${enableBackground})`);
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  /**
   * Start foreground-only location tracking with high accuracy
   */
  private async startForegroundTracking(): Promise<void> {
    this.locationSubscription = await ExpoLocation.watchPositionAsync(
      {
        accuracy: ExpoLocation.Accuracy.BestForNavigation,
        timeInterval: GPS_CONFIG.TIME_INTERVAL,
        distanceInterval: GPS_CONFIG.DISTANCE_INTERVAL,
      },
      (expoLocation) => {
        this.handleLocationUpdate(expoLocation);
      }
    );
  }

  /**
   * Start background location tracking
   */
  private async startBackgroundTracking(): Promise<void> {
    // Request battery optimization exemption before starting background tracking
    await batteryOptimizationService.ensureBatteryExemption('tracking');

    // Set up callback for background location updates
    setBackgroundLocationCallback((location: Location) => {
      // Process location through the same pipeline
      this.handleBackgroundLocationUpdate(location);
    });

    // Start the background task
    await startBackgroundLocationTracking();
  }

  /**
   * Stop GPS tracking
   */
  async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      return;
    }

    try {
      if (this.useBackgroundTracking) {
        // Stop background tracking
        await stopBackgroundLocationTracking();
        clearBackgroundLocationCallback();
        resetBackgroundState();
      }

      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      this.isTracking = false;
      this.isPaused = false;
      this.useBackgroundTracking = false;
      this.lastLocation = null;
      this.kalmanState = null;
      console.log('Location tracking stopped');
    } catch (error) {
      console.error('Error stopping location tracking:', error);
      throw error;
    }
  }

  /**
   * Pause location tracking (stops emitting updates but keeps subscription)
   */
  pauseTracking(): void {
    if (!this.isTracking) {
      return;
    }
    this.isPaused = true;
    console.log('Location tracking paused');
  }

  /**
   * Resume location tracking
   */
  resumeTracking(): void {
    if (!this.isTracking) {
      return;
    }
    this.isPaused = false;
    console.log('Location tracking resumed');
  }

  /**
   * Get current location once
   */
  async getCurrentLocation(): Promise<Location> {
    const hasPermission = await this.hasPermissions();
    if (!hasPermission) {
      throw new Error('Location permissions not granted');
    }

    try {
      const expoLocation = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.BestForNavigation,
      });

      return this.convertExpoLocation(expoLocation);
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  /**
   * Subscribe to location updates
   */
  onLocationUpdate(callback: LocationUpdateCallback): () => void {
    this.updateCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Get GPS signal quality status
   */
  getAccuracyStatus(): AccuracyStatus {
    if (!this.lastLocation) {
      return {
        current: 0,
        quality: 'poor',
        gpsSignalStrength: 0,
      };
    }

    const accuracy = this.lastLocation.accuracy;
    let quality: AccuracyQuality;
    let signalStrength: number;

    if (accuracy <= 5) {
      quality = 'excellent';
      signalStrength = 100;
    } else if (accuracy <= 10) {
      quality = 'good';
      signalStrength = 75;
    } else if (accuracy <= 20) {
      quality = 'fair';
      signalStrength = 50;
    } else {
      quality = 'poor';
      signalStrength = 25;
    }

    return {
      current: accuracy,
      quality,
      gpsSignalStrength: signalStrength,
    };
  }

  /**
   * Check if currently tracking
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking && !this.isPaused;
  }

  /**
   * Get the last recorded location
   */
  getLastLocation(): Location | null {
    return this.lastLocation;
  }

  /**
   * Check if background tracking is active
   */
  async isBackgroundTrackingActive(): Promise<boolean> {
    return await isBackgroundLocationTrackingActive();
  }

  /**
   * Check if using background tracking mode
   */
  isUsingBackgroundTracking(): boolean {
    return this.useBackgroundTracking;
  }

  /**
   * Handle incoming location updates from foreground tracking
   */
  private handleLocationUpdate(expoLocation: ExpoLocation.LocationObject): void {
    if (this.isPaused) {
      return;
    }

    const location = this.convertExpoLocation(expoLocation);

    // Filter out inaccurate points
    if (!this.isAccurate(location)) {
      console.log(`Rejected inaccurate location: ${location.accuracy}m`);
      return;
    }

    // Always allow the first location through (for initial map centering)
    const isFirstLocation = this.lastLocation === null;

    // Detect stationary points (but not for first location)
    if (!isFirstLocation && this.isStationary(location)) {
      console.log('Stationary point detected, skipping');
      return;
    }

    // Apply Kalman filter for smoothing
    const smoothedLocation = this.applyKalmanFilter(location);

    // Check minimum distance from last point (but not for first location)
    if (!isFirstLocation && this.lastLocation && !this.hasMovedEnough(smoothedLocation, this.lastLocation)) {
      return;
    }

    this.lastLocation = smoothedLocation;

    // Notify all subscribers
    this.notifySubscribers(smoothedLocation);
  }

  /**
   * Handle incoming location updates from background tracking
   * Background task already applies filtering and Kalman smoothing
   */
  private handleBackgroundLocationUpdate(location: Location): void {
    if (this.isPaused) {
      return;
    }

    this.lastLocation = location;

    // Notify all subscribers
    this.notifySubscribers(location);
  }

  /**
   * Notify all subscribers of location update
   */
  private notifySubscribers(location: Location): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(location);
      } catch (error) {
        console.error('Error in location update callback:', error);
      }
    });
  }

  /**
   * Convert Expo location to our Location type
   */
  private convertExpoLocation(expoLocation: ExpoLocation.LocationObject): Location {
    return {
      latitude: expoLocation.coords.latitude,
      longitude: expoLocation.coords.longitude,
      altitude: expoLocation.coords.altitude,
      accuracy: expoLocation.coords.accuracy || 999,
      timestamp: expoLocation.timestamp,
      speed: expoLocation.coords.speed,
      heading: expoLocation.coords.heading,
    };
  }

  /**
   * Check if location accuracy is acceptable
   */
  private isAccurate(location: Location): boolean {
    return location.accuracy <= GPS_CONFIG.ACCURACY_THRESHOLD;
  }

  /**
   * Detect if the user is stationary
   */
  private isStationary(location: Location): boolean {
    // If speed is available and below threshold, consider stationary
    if (location.speed !== null && location.speed < GPS_CONFIG.STATIONARY_SPEED_THRESHOLD) {
      return true;
    }

    // If no speed data, check distance from last location
    if (this.lastLocation) {
      const distance = this.calculateDistance(
        this.lastLocation.latitude,
        this.lastLocation.longitude,
        location.latitude,
        location.longitude
      );
      
      const timeDiff = (location.timestamp - this.lastLocation.timestamp) / 1000; // seconds
      const speed = distance / timeDiff;
      
      return speed < GPS_CONFIG.STATIONARY_SPEED_THRESHOLD;
    }

    return false;
  }

  /**
   * Check if location has moved enough from last point
   */
  private hasMovedEnough(current: Location, last: Location): boolean {
    const distance = this.calculateDistance(
      last.latitude,
      last.longitude,
      current.latitude,
      current.longitude
    );
    
    return distance >= GPS_CONFIG.MIN_DISTANCE_BETWEEN_POINTS;
  }

  /**
   * Apply Kalman filter for GPS smoothing
   * Reduces GPS jitter while maintaining accuracy
   */
  private applyKalmanFilter(measurement: Location): Location {
    if (!this.kalmanState) {
      // Initialize Kalman state with first measurement
      this.kalmanState = {
        latitude: measurement.latitude,
        longitude: measurement.longitude,
        variance: measurement.accuracy * measurement.accuracy,
      };
      return measurement;
    }

    // Prediction step (assume no movement prediction, just use last state)
    const predictedVariance = this.kalmanState.variance + GPS_CONFIG.KALMAN_Q;

    // Update step
    const measurementVariance = measurement.accuracy * measurement.accuracy;
    const kalmanGain = predictedVariance / (predictedVariance + measurementVariance + GPS_CONFIG.KALMAN_R);

    // Update state
    const newLatitude = this.kalmanState.latitude + kalmanGain * (measurement.latitude - this.kalmanState.latitude);
    const newLongitude = this.kalmanState.longitude + kalmanGain * (measurement.longitude - this.kalmanState.longitude);
    const newVariance = (1 - kalmanGain) * predictedVariance;

    this.kalmanState = {
      latitude: newLatitude,
      longitude: newLongitude,
      variance: newVariance,
    };

    // Return smoothed location
    return {
      ...measurement,
      latitude: newLatitude,
      longitude: newLongitude,
      accuracy: Math.sqrt(newVariance),
    };
  }

  /**
   * Calculate distance between two coordinates (delegates to shared utility)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return calculateDistance(lat1, lon1, lat2, lon2);
  }
}

// Export singleton instance
export const locationService = new LocationService();
export default locationService;
