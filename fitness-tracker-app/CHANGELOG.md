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
