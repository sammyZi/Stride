/**
 * Tracking Configuration - Single Source of Truth
 * 
 * All GPS tracking, location accuracy, and activity tracking configuration values
 * are defined here to ensure consistency across the app.
 */

/**
 * GPS Location Tracking Configuration
 */
export const GPS_CONFIG = {
  // Update intervals
  TIME_INTERVAL: 2000, // milliseconds - how often to request location updates
  DISTANCE_INTERVAL: 3, // meters - minimum distance change to trigger update
  
  // Accuracy thresholds
  ACCURACY_THRESHOLD: 30, // meters - maximum acceptable GPS accuracy
  MIN_DISTANCE_BETWEEN_POINTS: 3, // meters - minimum distance to record new point
  
  // Motion detection
  STATIONARY_SPEED_THRESHOLD: 0.3, // m/s - speed below which user is considered stationary
  
  // Kalman filter parameters (for GPS smoothing)
  KALMAN_Q: 2, // Process noise - lower = tighter smoothing
  KALMAN_R: 8, // Measurement noise - lower = trust GPS more
} as const;

/**
 * Background Tracking Configuration
 */
export const BACKGROUND_TRACKING_CONFIG = {
  // Notification settings
  NOTIFICATION_TITLE: 'Activity Tracking',
  NOTIFICATION_BODY: 'Tracking your activity with high accuracy...',
  NOTIFICATION_COLOR: '#6C63FF',
  
  // Deferred updates (for battery optimization)
  DEFERRED_UPDATES_INTERVAL: 2000, // milliseconds
  DEFERRED_UPDATES_DISTANCE: 3, // meters
  
  // Background location indicator
  SHOW_BACKGROUND_INDICATOR: true,
} as const;

/**
 * Activity Tracking Configuration
 */
export const ACTIVITY_CONFIG = {
  // Metrics update frequency
  METRICS_UPDATE_INTERVAL: 1000, // milliseconds - how often to update UI metrics
  
  // Auto-pause detection
  AUTO_PAUSE_ENABLED: false, // Feature flag for auto-pause
  AUTO_PAUSE_TIMEOUT: 180, // seconds - time stationary before auto-pause
  
  // Minimum activity requirements
  MIN_ACTIVITY_DISTANCE: 50, // meters - minimum distance to save activity
  MIN_ACTIVITY_DURATION: 60, // seconds - minimum duration to save activity
} as const;

/**
 * Calorie Calculation Configuration
 * MET (Metabolic Equivalent of Task) values based on speed
 */
export const CALORIE_CONFIG = {
  // Speed thresholds (km/h) and corresponding MET values
  SPEED_MET_RANGES: [
    { maxSpeed: 3.2, met: 2.5, label: 'Slow walking' },
    { maxSpeed: 4.8, met: 3.5, label: 'Moderate walking' },
    { maxSpeed: 6.4, met: 5.0, label: 'Brisk walking' },
    { maxSpeed: 8.0, met: 7.0, label: 'Very brisk walking / light jogging' },
    { maxSpeed: 10.0, met: 9.8, label: 'Running (moderate)' },
    { maxSpeed: 12.0, met: 11.5, label: 'Running (fast)' },
    { maxSpeed: Infinity, met: 13.5, label: 'Running (very fast)' },
  ],
} as const;

/**
 * Battery Optimization Configuration
 */
export const BATTERY_CONFIG = {
  // Request cooldown
  REQUEST_COOLDOWN_HOURS: 24, // hours - minimum time between battery exemption requests
  
  // Check frequency
  CHECK_ON_APP_START: true, // Check battery optimization on app start
  CHECK_BEFORE_TRACKING: true, // Check before starting activity tracking
  
  // Prompt behavior
  SHOW_PROMPT_ON_FIRST_LAUNCH: true, // Show prompt during onboarding
  SKIP_COOLDOWN_ON_FIRST_LAUNCH: true, // Skip cooldown for first request
} as const;

/**
 * Notification Configuration
 */
export const NOTIFICATION_CONFIG = {
  // Update throttling
  UPDATE_THROTTLE_MS: 5000, // milliseconds - minimum time between notification updates
  
  // Notification IDs
  ACTIVITY_NOTIFICATION_ID: 'activity-tracking',
  COMPLETION_NOTIFICATION_ID: 'activity-completion',
  
  // Priority levels
  TRACKING_PRIORITY: 'LOW' as const, // Low priority to avoid sound during tracking
  COMPLETION_PRIORITY: 'DEFAULT' as const, // Default priority for completion
} as const;

/**
 * Audio Announcement Configuration
 */
export const AUDIO_CONFIG = {
  // Announcement intervals (meters)
  ANNOUNCEMENT_INTERVALS: [500, 1000, 1500, 2000], // meters
  
  // Speech settings
  SPEECH_RATE: 1.0, // Normal speed
  SPEECH_PITCH: 1.0, // Normal pitch
  SPEECH_LANGUAGE: 'en-US',
} as const;

/**
 * Map Configuration
 */
export const MAP_CONFIG = {
  // Default map settings
  DEFAULT_ZOOM: 16,
  DEFAULT_PITCH: 0,
  DEFAULT_HEADING: 0,
  
  // Route styling
  ROUTE_LINE_WIDTH: 4,
  ROUTE_LINE_COLOR: '#6C63FF',
  ROUTE_LINE_OPACITY: 0.8,
  
  // Marker styling
  CURRENT_LOCATION_MARKER_SIZE: 20,
  START_MARKER_COLOR: '#10B981',
  END_MARKER_COLOR: '#EF4444',
} as const;

/**
 * Storage Configuration
 */
export const STORAGE_CONFIG = {
  // Keys
  ACTIVITIES_KEY: 'activities',
  SETTINGS_KEY: 'settings',
  GOALS_KEY: 'goals',
  STATS_KEY: 'stats',
  BATTERY_EXEMPTION_KEY: 'battery_exemption_last_request',
  BATTERY_STATUS_KEY: 'battery_optimization_status',
  
  // Cache settings
  MAX_CACHED_ACTIVITIES: 100,
  CACHE_EXPIRY_DAYS: 30,
} as const;

/**
 * Permission Configuration
 */
export const PERMISSION_CONFIG = {
  // Request behavior
  REQUEST_ON_APP_START: false, // Don't request on app start (wait for user action)
  SHOW_RATIONALE: true, // Show explanation before requesting
  
  // Required permissions
  REQUIRED_PERMISSIONS: [
    'location_foreground',
    'location_background',
    'notifications',
  ] as const,
} as const;

/**
 * Helper function to get MET value based on speed
 */
export function getMetForSpeed(speedKmh: number): { met: number; label: string } {
  const range = CALORIE_CONFIG.SPEED_MET_RANGES.find(
    (r) => speedKmh < r.maxSpeed
  );
  return range || CALORIE_CONFIG.SPEED_MET_RANGES[CALORIE_CONFIG.SPEED_MET_RANGES.length - 1];
}

/**
 * Helper function to validate configuration
 * Call this on app start to ensure all values are valid
 */
export function validateTrackingConfig(): boolean {
  try {
    // Validate GPS config
    if (GPS_CONFIG.TIME_INTERVAL < 1000) {
      console.warn('GPS_CONFIG.TIME_INTERVAL is too low, may drain battery');
    }
    if (GPS_CONFIG.ACCURACY_THRESHOLD > 50) {
      console.warn('GPS_CONFIG.ACCURACY_THRESHOLD is high, may reduce accuracy');
    }
    
    // Validate activity config
    if (ACTIVITY_CONFIG.MIN_ACTIVITY_DISTANCE < 10) {
      console.warn('ACTIVITY_CONFIG.MIN_ACTIVITY_DISTANCE is very low');
    }
    
    // Validate battery config
    if (BATTERY_CONFIG.REQUEST_COOLDOWN_HOURS < 1) {
      console.warn('BATTERY_CONFIG.REQUEST_COOLDOWN_HOURS is too low, may annoy users');
    }
    
    return true;
  } catch (error) {
    console.error('Configuration validation failed:', error);
    return false;
  }
}

// Export all configs as a single object for convenience
export const TRACKING_CONFIG = {
  GPS: GPS_CONFIG,
  BACKGROUND: BACKGROUND_TRACKING_CONFIG,
  ACTIVITY: ACTIVITY_CONFIG,
  CALORIE: CALORIE_CONFIG,
  BATTERY: BATTERY_CONFIG,
  NOTIFICATION: NOTIFICATION_CONFIG,
  AUDIO: AUDIO_CONFIG,
  MAP: MAP_CONFIG,
  STORAGE: STORAGE_CONFIG,
  PERMISSION: PERMISSION_CONFIG,
} as const;

export default TRACKING_CONFIG;
