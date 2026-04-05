# Quick Reference - Configuration & Battery Optimization

## Import Configuration

```typescript
// Import specific configs
import { GPS_CONFIG, BATTERY_CONFIG } from '@/config/tracking';

// Import all configs
import TRACKING_CONFIG from '@/config/tracking';

// Import from index
import { GPS_CONFIG, BATTERY_CONFIG } from '@/config';
```

## Common Configuration Values

### GPS Settings
```typescript
GPS_CONFIG.TIME_INTERVAL              // 2000ms - update frequency
GPS_CONFIG.DISTANCE_INTERVAL          // 3m - minimum distance
GPS_CONFIG.ACCURACY_THRESHOLD         // 30m - max acceptable accuracy
GPS_CONFIG.STATIONARY_SPEED_THRESHOLD // 0.3 m/s - motion threshold
GPS_CONFIG.KALMAN_Q                   // 2 - process noise
GPS_CONFIG.KALMAN_R                   // 8 - measurement noise
```

### Battery Settings
```typescript
BATTERY_CONFIG.REQUEST_COOLDOWN_HOURS      // 24 - hours between prompts
BATTERY_CONFIG.CHECK_ON_APP_START          // true - check on launch
BATTERY_CONFIG.CHECK_BEFORE_TRACKING       // true - check before activity
BATTERY_CONFIG.SHOW_PROMPT_ON_FIRST_LAUNCH // true - show during onboarding
```

### Activity Settings
```typescript
ACTIVITY_CONFIG.METRICS_UPDATE_INTERVAL // 1000ms - UI update frequency
ACTIVITY_CONFIG.MIN_ACTIVITY_DISTANCE   // 50m - minimum to save
ACTIVITY_CONFIG.MIN_ACTIVITY_DURATION   // 60s - minimum to save
```

## Battery Optimization Service

### Check Before Tracking
```typescript
import batteryOptimizationService from '@/services/battery/BatteryOptimizationService';

// Automatically checks and prompts if needed (respects cooldown)
const exempted = await batteryOptimizationService.checkBeforeTracking();

if (!exempted) {
  console.warn('Battery optimization is enabled');
}
```

### Manual Check
```typescript
// Check if battery optimization is enabled
const isOptimized = await batteryOptimizationService.isAppBatteryOptimized();

// Request exemption (respects cooldown)
await batteryOptimizationService.ensureBatteryExemption('tracking');

// Force prompt (ignores cooldown)
await batteryOptimizationService.ensureBatteryExemption('tracking', true);
```

### Get Status
```typescript
const status = await batteryOptimizationService.getBatteryStatus();
console.log('Optimized:', status.isOptimized);
console.log('Can request:', status.canRequestExemption);
console.log('Last checked:', new Date(status.lastChecked));
```

### Show Info Dialog
```typescript
// Show informational dialog about battery optimization
batteryOptimizationService.showBatteryOptimizationInfo();
```

### Mark as Disabled
```typescript
// After user confirms they disabled it in settings
await batteryOptimizationService.markBatteryOptimizationDisabled();
```

### Reset Status
```typescript
// Force recheck on next call
await batteryOptimizationService.resetBatteryStatus();
```

## Location Service with Config

```typescript
import locationService from '@/services/location/LocationService';

// Start tracking (automatically uses GPS_CONFIG values)
await locationService.startTracking(true); // true = enable background

// Get accuracy status
const accuracy = locationService.getAccuracyStatus();
console.log('Quality:', accuracy.quality); // 'excellent' | 'good' | 'fair' | 'poor'
console.log('Accuracy:', accuracy.current, 'm');
```

## Calorie Calculation

```typescript
import { getMetForSpeed } from '@/config/tracking';

// Get MET value for a given speed
const speed = 8.5; // km/h
const { met, label } = getMetForSpeed(speed);
console.log(`Speed ${speed} km/h: ${met} METs (${label})`);
// Output: "Speed 8.5 km/h: 9.8 METs (Running (moderate))"
```

## Configuration Validation

```typescript
import { validateTrackingConfig } from '@/config/tracking';

// Validate configuration on app start
if (!validateTrackingConfig()) {
  console.error('Invalid tracking configuration');
}
```

## Common Patterns

### Before Starting Activity
```typescript
// 1. Check battery optimization
const batteryOk = await batteryOptimizationService.checkBeforeTracking();

// 2. Check location permissions
const hasPermission = await locationService.hasBackgroundPermissions();

// 3. Start tracking
if (hasPermission) {
  await locationService.startTracking(true);
}
```

### On App Start
```typescript
// Optional: Check battery optimization on app start
await batteryOptimizationService.checkOnAppStart();

// Validate configuration
validateTrackingConfig();
```

### Tuning for Battery Life
```typescript
// In src/config/tracking.ts
export const GPS_CONFIG = {
  TIME_INTERVAL: 5000,        // Update every 5 seconds (was 2000)
  DISTANCE_INTERVAL: 10,      // 10 meters (was 3)
  ACCURACY_THRESHOLD: 50,     // Accept less accurate points (was 30)
  // ... other settings
}
```

### Tuning for Accuracy
```typescript
// In src/config/tracking.ts
export const GPS_CONFIG = {
  TIME_INTERVAL: 1000,        // Update every second (was 2000)
  DISTANCE_INTERVAL: 2,       // 2 meters (was 3)
  ACCURACY_THRESHOLD: 20,     // Only accept accurate points (was 30)
  // ... other settings
}
```

## Storage Keys

```typescript
import { STORAGE_CONFIG } from '@/config/tracking';

STORAGE_CONFIG.ACTIVITIES_KEY              // 'activities'
STORAGE_CONFIG.SETTINGS_KEY                // 'settings'
STORAGE_CONFIG.BATTERY_EXEMPTION_KEY       // 'battery_exemption_last_request'
STORAGE_CONFIG.BATTERY_STATUS_KEY          // 'battery_optimization_status'
```

## Notification Config

```typescript
import { NOTIFICATION_CONFIG } from '@/config/tracking';

NOTIFICATION_CONFIG.UPDATE_THROTTLE_MS     // 5000ms - throttle updates
NOTIFICATION_CONFIG.ACTIVITY_NOTIFICATION_ID // 'activity-tracking'
NOTIFICATION_CONFIG.TRACKING_PRIORITY      // 'LOW'
NOTIFICATION_CONFIG.COMPLETION_PRIORITY    // 'DEFAULT'
```

## Map Config

```typescript
import { MAP_CONFIG } from '@/config/tracking';

MAP_CONFIG.DEFAULT_ZOOM                    // 16
MAP_CONFIG.ROUTE_LINE_WIDTH                // 4
MAP_CONFIG.ROUTE_LINE_COLOR                // '#6C63FF'
MAP_CONFIG.CURRENT_LOCATION_MARKER_SIZE    // 20
```

## Troubleshooting Quick Fixes

### GPS not working
```typescript
// Increase accuracy threshold
GPS_CONFIG.ACCURACY_THRESHOLD = 50; // Accept less accurate points
```

### Battery draining
```typescript
// Reduce update frequency
GPS_CONFIG.TIME_INTERVAL = 5000; // Update every 5 seconds
GPS_CONFIG.DISTANCE_INTERVAL = 10; // 10 meters
```

### Too many battery prompts
```typescript
// Increase cooldown
BATTERY_CONFIG.REQUEST_COOLDOWN_HOURS = 72; // Once every 3 days
```

### Background tracking stops
```typescript
// Ensure battery optimization is disabled
const isOptimized = await batteryOptimizationService.isAppBatteryOptimized();
if (isOptimized) {
  await batteryOptimizationService.ensureBatteryExemption('tracking', true);
}
```

## Best Practices

1. ✅ Always check battery optimization before starting tracking
2. ✅ Use centralized config instead of hardcoded values
3. ✅ Validate configuration on app start
4. ✅ Test configuration changes on real devices
5. ✅ Monitor battery usage after changes
6. ✅ Respect cooldown periods for battery prompts
7. ✅ Provide clear user guidance for battery settings

## See Also

- `docs/CONFIGURATION.md` - Detailed configuration guide
- `src/config/tracking.ts` - Configuration source file
- `src/services/battery/BatteryOptimizationService.ts` - Battery service implementation
