# Changelog

## GPS Improvements & Simplified Activity Tracking

### Changes Made

#### 1. Simplified Activity Types
- **Removed** walk/run distinction - now just "Activity"
- **Removed** activity type selector from tracking screen
- **Updated** ActivityType from `'walking' | 'running'` to `'activity'`
- Calorie calculation now automatically determines intensity based on pace/speed

#### 2. GPS Accuracy Improvements
- **Increased** GPS update frequency: 3s → 2s (more frequent location updates)
- **Reduced** distance interval: 5m → 3m (capture more route detail)
- **Relaxed** accuracy threshold: 20m → 30m (accept more GPS points)
- **Lowered** stationary detection: 0.5 m/s → 0.3 m/s (better motion detection)
- **Improved** Kalman filter settings for tighter GPS smoothing
- **Reduced** minimum distance between points: 5m → 3m (more detailed routes)

#### 3. UI Changes
- Simplified start button: "Start Activity" instead of walk/run selector
- Removed activity type filter from history screen
- Updated all activity icons to use consistent "fitness" icon
- Updated notifications to show "Activity" instead of "Walk" or "Run"

### Technical Details

**Files Modified:**
- `src/types/index.ts` - Updated ActivityType definition
- `src/screens/activity/ActivityTrackingScreen.tsx` - Removed type selector
- `src/services/location/LocationService.ts` - Improved GPS settings
- `src/services/location/BackgroundLocationTask.ts` - Improved GPS settings
- `src/utils/calculations.ts` - Pace-based calorie calculation
- `src/services/notification/NotificationService.ts` - Updated notifications
- `src/services/audio/AudioAnnouncementService.ts` - Updated announcements
- `src/services/sharing/SharingService.ts` - Updated sharing text
- `src/components/activity/*.tsx` - Updated activity display components
- `src/screens/history/ActivityHistoryScreen.tsx` - Removed type filter

**GPS Configuration Changes:**
```typescript
// Before
timeInterval: 3000ms
distanceInterval: 5m
ACCURACY_THRESHOLD: 20m
STATIONARY_SPEED_THRESHOLD: 0.5 m/s
MIN_DISTANCE_BETWEEN_POINTS: 5m

// After
timeInterval: 2000ms
distanceInterval: 3m
ACCURACY_THRESHOLD: 30m
STATIONARY_SPEED_THRESHOLD: 0.3 m/s
MIN_DISTANCE_BETWEEN_POINTS: 3m
```

### Benefits

1. **Better GPS Tracking**: More frequent updates and more lenient thresholds mean better route capture, especially in areas with weaker GPS signal
2. **Simpler UX**: Users don't need to choose between walk/run - the app automatically determines intensity
3. **Automatic Intensity Detection**: Calorie calculation now uses pace-based MET values (2.5-13.5 METs) based on actual speed
4. **More Detailed Routes**: Smaller distance intervals capture more route detail for better map visualization

### Migration Notes

- Existing activities with 'walking' or 'running' types will still display correctly
- New activities will be created with type 'activity'
- No data migration needed - backward compatible


---

## Centralized Configuration & Battery Optimization Improvements

### Changes Made

#### 1. Single Source of Truth for Configuration
- **Created** `src/config/tracking.ts` - centralized configuration file
- **Consolidated** all GPS, tracking, battery, and notification settings
- **Removed** duplicate hardcoded values across services
- **Added** configuration validation function
- **Removed** Supabase references (not needed until social features are implemented)

#### 2. Enhanced Battery Optimization Service
- **Added** battery status caching to reduce checks
- **Implemented** check before EVERY activity tracking session
- **Added** configurable cooldown period (24 hours default)
- **Improved** user messaging with clearer instructions
- **Added** status tracking and persistence
- **Implemented** methods to mark optimization as disabled

#### 3. Configuration Sections

**GPS Configuration:**
- Time interval: 2000ms
- Distance interval: 3m
- Accuracy threshold: 30m
- Stationary speed threshold: 0.3 m/s
- Kalman filter parameters: Q=2, R=8
- Minimum distance between points: 3m

**Battery Configuration:**
- Request cooldown: 24 hours
- Check on app start: enabled
- Check before tracking: enabled
- Show prompt on first launch: enabled
- Skip cooldown on first launch: enabled

**Activity Configuration:**
- Metrics update interval: 1000ms
- Minimum activity distance: 50m
- Minimum activity duration: 60s

**Calorie Configuration:**
- Speed-based MET ranges (2.5 - 13.5 METs)
- Automatic intensity detection

### Technical Details

**New Files:**
- `src/config/tracking.ts` - Single source of truth for all configuration
- `docs/CONFIGURATION.md` - Comprehensive configuration guide

**Modified Files:**
- `src/services/battery/BatteryOptimizationService.ts` - Enhanced with status caching and better checks
- `src/services/location/LocationService.ts` - Uses centralized config
- `src/services/location/BackgroundLocationTask.ts` - Uses centralized config

**Configuration Structure:**
```typescript
TRACKING_CONFIG = {
  GPS: { ... },
  BACKGROUND: { ... },
  ACTIVITY: { ... },
  CALORIE: { ... },
  BATTERY: { ... },
  NOTIFICATION: { ... },
  AUDIO: { ... },
  MAP: { ... },
  STORAGE: { ... },
  PERMISSION: { ... },
}
```

### Battery Optimization Flow

1. **App Start**: Optional check if battery optimization is enabled
2. **Before Tracking**: ALWAYS check before starting activity
3. **User Prompt**: Show dialog with clear instructions
4. **Settings**: Direct user to battery optimization settings
5. **Cooldown**: Respect 24-hour cooldown between prompts
6. **Status Cache**: Cache status for 5 minutes to reduce checks

### Benefits

1. **Consistency**: All services use the same configuration values
2. **Maintainability**: Single place to update configuration
3. **Reliability**: Battery checks ensure background tracking works
4. **User Experience**: Clear guidance on battery optimization
5. **Flexibility**: Easy to tune configuration for different needs
6. **Documentation**: Comprehensive guide for configuration changes

### Usage Examples

**Import Configuration:**
```typescript
import { GPS_CONFIG, BATTERY_CONFIG } from '@/config/tracking';

// Use GPS settings
const interval = GPS_CONFIG.TIME_INTERVAL;
const threshold = GPS_CONFIG.ACCURACY_THRESHOLD;
```

**Check Battery Before Tracking:**
```typescript
import batteryOptimizationService from '@/services/battery/BatteryOptimizationService';

// Automatically checks and prompts if needed
const exempted = await batteryOptimizationService.checkBeforeTracking();
```

**Get Battery Status:**
```typescript
const status = await batteryOptimizationService.getBatteryStatus();
console.log('Optimized:', status.isOptimized);
console.log('Last checked:', new Date(status.lastChecked));
```

### Migration Notes

- Existing code with hardcoded values should be updated to use centralized config
- Battery optimization checks are now automatic before each tracking session
- No breaking changes - all existing functionality preserved
- Configuration can be tuned without code changes

### Troubleshooting

**If GPS tracking is unreliable:**
- Check `GPS_CONFIG.ACCURACY_THRESHOLD` (may be too strict)
- Verify battery optimization is disabled
- Ensure background location permission is granted

**If battery drains too fast:**
- Increase `GPS_CONFIG.TIME_INTERVAL` to 3000-5000ms
- Increase `GPS_CONFIG.DISTANCE_INTERVAL` to 5-10m

**If too many battery prompts:**
- Increase `BATTERY_CONFIG.REQUEST_COOLDOWN_HOURS`
- User needs to actually disable battery optimization in settings

### Documentation

See `docs/CONFIGURATION.md` for:
- Detailed configuration guide
- Tuning guidelines
- Best practices
- Troubleshooting tips
- Migration instructions
