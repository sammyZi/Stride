# Configuration Guide

## Single Source of Truth

All tracking configuration values are centralized in `src/config/tracking.ts` to ensure consistency across the app.

## Configuration Sections

### 1. GPS Configuration (`GPS_CONFIG`)

Controls GPS tracking accuracy and behavior:

```typescript
{
  TIME_INTERVAL: 2000,              // ms - location update frequency
  DISTANCE_INTERVAL: 3,             // meters - minimum distance for update
  ACCURACY_THRESHOLD: 30,           // meters - max acceptable GPS accuracy
  MIN_DISTANCE_BETWEEN_POINTS: 3,  // meters - minimum distance to record
  STATIONARY_SPEED_THRESHOLD: 0.3, // m/s - speed threshold for motion
  KALMAN_Q: 2,                      // Kalman filter process noise
  KALMAN_R: 8,                      // Kalman filter measurement noise
}
```

**Tuning Guidelines:**
- Lower `TIME_INTERVAL` = more frequent updates, higher battery usage
- Lower `DISTANCE_INTERVAL` = more detailed routes, more data points
- Higher `ACCURACY_THRESHOLD` = accept more GPS points, may reduce accuracy
- Lower `KALMAN_Q` = tighter smoothing, less responsive to quick changes
- Lower `KALMAN_R` = trust GPS more, less smoothing

### 2. Background Tracking Configuration (`BACKGROUND_TRACKING_CONFIG`)

Controls background location tracking behavior:

```typescript
{
  NOTIFICATION_TITLE: 'Activity Tracking',
  NOTIFICATION_BODY: 'Tracking your activity with high accuracy...',
  NOTIFICATION_COLOR: '#6C63FF',
  DEFERRED_UPDATES_INTERVAL: 2000,
  DEFERRED_UPDATES_DISTANCE: 3,
  SHOW_BACKGROUND_INDICATOR: true,
}
```

### 3. Activity Configuration (`ACTIVITY_CONFIG`)

Controls activity tracking behavior:

```typescript
{
  METRICS_UPDATE_INTERVAL: 1000,    // ms - UI update frequency
  AUTO_PAUSE_ENABLED: false,        // Feature flag
  AUTO_PAUSE_TIMEOUT: 180,          // seconds
  MIN_ACTIVITY_DISTANCE: 50,        // meters - minimum to save
  MIN_ACTIVITY_DURATION: 60,        // seconds - minimum to save
}
```

### 4. Battery Configuration (`BATTERY_CONFIG`)

Controls battery optimization prompts:

```typescript
{
  REQUEST_COOLDOWN_HOURS: 24,           // hours between prompts
  CHECK_ON_APP_START: true,             // Check on app launch
  CHECK_BEFORE_TRACKING: true,          // Check before each activity
  SHOW_PROMPT_ON_FIRST_LAUNCH: true,   // Show during onboarding
  SKIP_COOLDOWN_ON_FIRST_LAUNCH: true, // Skip cooldown for first prompt
}
```

**Important:** The app will check battery optimization status before EVERY activity tracking session to ensure reliable background tracking.

### 5. Calorie Configuration (`CALORIE_CONFIG`)

MET (Metabolic Equivalent of Task) values for calorie calculation:

```typescript
{
  SPEED_MET_RANGES: [
    { maxSpeed: 3.2, met: 2.5, label: 'Slow walking' },
    { maxSpeed: 4.8, met: 3.5, label: 'Moderate walking' },
    { maxSpeed: 6.4, met: 5.0, label: 'Brisk walking' },
    { maxSpeed: 8.0, met: 7.0, label: 'Very brisk walking / light jogging' },
    { maxSpeed: 10.0, met: 9.8, label: 'Running (moderate)' },
    { maxSpeed: 12.0, met: 11.5, label: 'Running (fast)' },
    { maxSpeed: Infinity, met: 13.5, label: 'Running (very fast)' },
  ],
}
```

## Battery Optimization Service

### Overview

The `BatteryOptimizationService` ensures the app has unrestricted battery access for reliable background tracking.

### Key Features

1. **Status Checking**: Checks if battery optimization is enabled
2. **Smart Prompting**: Respects cooldown periods to avoid annoying users
3. **Automatic Checks**: Checks before each tracking session
4. **User Guidance**: Provides clear instructions for disabling optimization

### Usage

```typescript
import batteryOptimizationService from '@/services/battery/BatteryOptimizationService';

// Check before starting tracking
const exempted = await batteryOptimizationService.checkBeforeTracking();

// Manually request exemption
await batteryOptimizationService.ensureBatteryExemption('tracking');

// Get current status
const status = await batteryOptimizationService.getBatteryStatus();

// Show info dialog
batteryOptimizationService.showBatteryOptimizationInfo();
```

### Behavior

1. **First Launch**: Prompts user to disable battery optimization (skips cooldown)
2. **Before Each Activity**: Checks if optimization is enabled
3. **Cooldown Period**: Won't prompt again for 24 hours (configurable)
4. **User Feedback**: Clear instructions on what to select in settings

### Android Settings

When prompted, users should:
1. Tap "Open Settings"
2. Find the app in the list
3. Select "Don't optimize" or "Unrestricted"
4. Confirm the selection

## Modifying Configuration

### To Change GPS Accuracy

Edit `src/config/tracking.ts`:

```typescript
export const GPS_CONFIG = {
  // For better accuracy (higher battery usage)
  TIME_INTERVAL: 1000,  // Update every second
  ACCURACY_THRESHOLD: 20, // Only accept very accurate points
  
  // For better battery life (lower accuracy)
  TIME_INTERVAL: 5000,  // Update every 5 seconds
  ACCURACY_THRESHOLD: 50, // Accept less accurate points
}
```

### To Change Battery Prompt Frequency

Edit `src/config/tracking.ts`:

```typescript
export const BATTERY_CONFIG = {
  REQUEST_COOLDOWN_HOURS: 12, // Prompt twice per day
  // or
  REQUEST_COOLDOWN_HOURS: 72, // Prompt once every 3 days
}
```

### To Disable Battery Checks

```typescript
export const BATTERY_CONFIG = {
  CHECK_ON_APP_START: false,
  CHECK_BEFORE_TRACKING: false,
}
```

**Warning:** Disabling battery checks may result in unreliable background tracking.

## Validation

The configuration includes a validation function:

```typescript
import { validateTrackingConfig } from '@/config/tracking';

// Call on app start
if (!validateTrackingConfig()) {
  console.error('Invalid tracking configuration');
}
```

This checks for:
- GPS intervals that are too aggressive
- Accuracy thresholds that are too lenient
- Battery cooldown periods that are too short

## Best Practices

1. **Test Changes**: Always test configuration changes on real devices
2. **Monitor Battery**: Check battery usage after changing GPS settings
3. **User Feedback**: Collect feedback on tracking accuracy and battery life
4. **Gradual Changes**: Make small incremental changes, not large jumps
5. **Document Changes**: Update this file when modifying configuration

## Troubleshooting

### GPS Not Working

1. Check `GPS_CONFIG.ACCURACY_THRESHOLD` - may be too strict
2. Increase `GPS_CONFIG.TIME_INTERVAL` - may be updating too fast
3. Check device GPS settings and permissions

### Battery Draining Fast

1. Increase `GPS_CONFIG.TIME_INTERVAL` to 3000-5000ms
2. Increase `GPS_CONFIG.DISTANCE_INTERVAL` to 5-10m
3. Reduce `GPS_CONFIG.ACCURACY_THRESHOLD` to 20m

### Background Tracking Stops

1. Ensure battery optimization is disabled
2. Check `BATTERY_CONFIG.CHECK_BEFORE_TRACKING` is true
3. Verify background location permission is granted
4. Check Android battery saver mode is off

### Too Many Battery Prompts

1. Increase `BATTERY_CONFIG.REQUEST_COOLDOWN_HOURS`
2. Set `CHECK_ON_APP_START` to false
3. User may need to actually disable battery optimization

## Migration Notes

### From Hardcoded Values

If you have hardcoded configuration values in your code:

1. Import the config: `import { GPS_CONFIG } from '@/config/tracking'`
2. Replace hardcoded values with config references
3. Remove local constants
4. Test thoroughly

### Example Migration

**Before:**
```typescript
const ACCURACY_THRESHOLD = 30;
const TIME_INTERVAL = 2000;
```

**After:**
```typescript
import { GPS_CONFIG } from '@/config/tracking';

// Use GPS_CONFIG.ACCURACY_THRESHOLD
// Use GPS_CONFIG.TIME_INTERVAL
```

## Related Files

- `src/config/tracking.ts` - Main configuration file
- `src/services/battery/BatteryOptimizationService.ts` - Battery optimization handling
- `src/services/location/LocationService.ts` - GPS tracking service
- `src/services/location/BackgroundLocationTask.ts` - Background tracking task
