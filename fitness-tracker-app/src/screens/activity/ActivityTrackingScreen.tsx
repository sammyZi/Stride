import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
  BackHandler,
  Animated,
  DeviceEventEmitter,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ConfirmModal } from '../../components/common';
import { LiveRouteMap } from '../../components/map/LiveRouteMap';
import ActivityService from '../../services/activity';
import locationService from '../../services/location';
import NotificationService from '../../services/notification';
import AudioAnnouncementService from '../../services/audio';
import HapticFeedbackService from '../../services/haptic';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import { useSettings } from '../../context';
import { formatDuration, formatDistance, formatPace, formatCalories } from '../../utils';
import { useTheme } from '../../hooks';
import { ActivityType } from '../../types';

const { width } = Dimensions.get('window');

// Helper: color-coded pace indicator
const getPaceColor = (paceSecondsPerKm: number, colors: any): string => {
  if (paceSecondsPerKm <= 0) return colors.textSecondary;
  if (paceSecondsPerKm < 360) return '#00D9A3';  // Fast — green
  if (paceSecondsPerKm < 600) return '#4ECDC4';  // Good — teal
  if (paceSecondsPerKm < 900) return colors.warning;  // Moderate — orange
  return colors.error;  // Slow — red
};

interface ActivityTrackingScreenProps {
  onBack?: () => void;
}

export const ActivityTrackingScreen: React.FC<ActivityTrackingScreenProps> = ({ onBack }) => {
  const { modalState, showConfirm, hideModal } = useConfirmModal();
  const { settings } = useSettings();
  const { colors, isDark } = useTheme();
  const [activityType] = useState<ActivityType>('activity');
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [currentPace, setCurrentPace] = useState(0);
  const [averagePace, setAveragePace] = useState(0);
  const [steps, setSteps] = useState(0);
  const [calories, setCalories] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [routePoints, setRoutePoints] = useState<any[]>([]);
  const [activityStartTime, setActivityStartTime] = useState<number>(0);
  const [pausedTime, setPausedTime] = useState<number>(0);
  const [lastPauseTime, setLastPauseTime] = useState<number>(0);
  const timerIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const initLocationUnsubRef = React.useRef<(() => void) | null>(null);

  // Pulse animation for live pace indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Signal App.tsx that the main Activity screen has fully mounted so the
  // splash screen can be dismissed only once this page is painted (avoids
  // showing a blank/half-mounted frame on launch).
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      DeviceEventEmitter.emit('ACTIVITY_SCREEN_READY');
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    if (isTracking && !isPaused) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isTracking, isPaused]);

  // Update services when settings change
  useEffect(() => {
    AudioAnnouncementService.updateSettings({
      enabled: settings.audioAnnouncements,
      interval: settings.announcementInterval,
      units: settings.units,
    });
  }, [settings.audioAnnouncements, settings.announcementInterval, settings.units]);

  useEffect(() => {
    initializeServices();

    // Handle Android back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (ActivityService.isActivityInProgress()) {
        // If tracking, show confirmation
        showConfirm(
          'Activity in Progress',
          'You have an active activity. What would you like to do?',
          [
            { text: 'Continue', onPress: hideModal, style: 'cancel' },
            {
              text: 'Stop & Save',
              onPress: async () => {
                try {
                  const metrics = ActivityService.getCurrentMetrics();
                  await ActivityService.stopActivity();
                  await AudioAnnouncementService.announceCompletion(
                    metrics.distance,
                    metrics.duration,
                    metrics.averagePace
                  );
                  await HapticFeedbackService.success();
                  await resetState();
                  hideModal();
                  if (onBack) onBack();
                } catch (error) {
                  console.error('Error stopping activity:', error);
                  hideModal();
                  if (onBack) onBack();
                }
              },
              style: 'default',
            },
            {
              text: 'Discard',
              onPress: async () => {
                try {
                  if (ActivityService.isActivityInProgress()) {
                    await ActivityService.discardActivity();
                  }
                  AudioAnnouncementService.stop();
                  await resetState();
                  hideModal();
                  if (onBack) onBack();
                } catch (error) {
                  console.error('Error discarding activity:', error);
                  hideModal();
                  if (onBack) onBack();
                }
              },
              style: 'destructive',
            },
          ],
          { icon: 'alert-circle', iconColor: colors.warning }
        );
        return true; // Prevent default back behavior
      } else {
        // If not tracking, allow back navigation
        if (onBack) {
          onBack();
          return true;
        }
        return false;
      }
    });

    return () => {
      backHandler.remove();
      // Clean up init location subscription
      if (initLocationUnsubRef.current) {
        initLocationUnsubRef.current();
        initLocationUnsubRef.current = null;
      }
      if (ActivityService.isActivityInProgress()) {
        console.log('Component unmounting, stopping activity');
        ActivityService.stopActivity();
      }
    };
  }, [onBack]); // Removed isTracking from dependencies to prevent cleanup on state change

  const initializeServices = async () => {
    await NotificationService.initialize();

    // Initialize audio announcements with settings from context
    AudioAnnouncementService.initialize({
      enabled: settings.audioAnnouncements,
      interval: settings.announcementInterval,
      units: settings.units,
    });

    // Initialize haptic feedback with settings from context
    HapticFeedbackService.initialize(settings.hapticFeedback ?? true);

    // Subscribe to location updates (store unsubscribe for cleanup)
    // Clean up any previous subscription first
    if (initLocationUnsubRef.current) {
      initLocationUnsubRef.current();
    }
    initLocationUnsubRef.current = locationService.onLocationUpdate((location) => {
      setCurrentLocation(location);
    });

    // Start foreground-only location tracking for map display (not for activity recording)
    try {
      const hasPermission = await locationService.hasPermissions();
      if (hasPermission && !locationService.isCurrentlyTracking()) {
        // Start with foreground-only mode (no background tracking)
        await locationService.startTracking(false);
        console.log('Started foreground location tracking for map');
      }
    } catch (error) {
      console.log('Location permission not granted:', error);
    }
  };

  // Local timer effect - updates duration every second
  useEffect(() => {
    if (!isTracking) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    console.log('Timer effect triggered - isTracking:', isTracking, 'isPaused:', isPaused);

    // Clear existing interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // If paused, don't start interval (timer stays frozen)
    if (isPaused) {
      console.log('Activity is PAUSED - timer frozen at:', duration);
      return;
    }

    console.log('Starting timer interval - start time:', activityStartTime, 'paused time:', pausedTime);

    // Update immediately
    const updateDuration = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - activityStartTime - pausedTime) / 1000);
      setDuration(elapsed);
    };

    updateDuration();

    timerIntervalRef.current = setInterval(updateDuration, 1000);

    return () => {
      if (timerIntervalRef.current) {
        console.log('Clearing timer interval');
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isTracking, isPaused, activityStartTime, pausedTime]);

  useEffect(() => {
    if (!isTracking) return;

    console.log('Setting up metrics subscription...');
    const unsubscribe = ActivityService.onMetricsUpdate((metrics) => {
      console.log('Metrics update:', {
        duration: metrics.duration,
        distance: metrics.distance,
        steps: metrics.steps,
        pace: metrics.currentPace
      });
      // Don't update duration from metrics - use local timer
      setDistance(metrics.distance);
      setCurrentPace(metrics.currentPace);
      setAveragePace(metrics.averagePace);
      setSteps(metrics.steps);
      setCalories(metrics.calories);

      // Check for distance milestones and announce
      if (AudioAnnouncementService.shouldAnnounce(metrics.distance)) {
        AudioAnnouncementService.announceDistance(metrics.distance, metrics.currentPace || metrics.averagePace);
        HapticFeedbackService.distanceMilestone();
      }
    });

    // Note: location updates are already handled by the init subscription
    // No need for a duplicate subscription here

    const updateRoutePoints = setInterval(() => {
      const activity = ActivityService.getCurrentActivity();
      if (activity) {
        setRoutePoints(activity.route);
      }
    }, 1000);

    return () => {
      console.log('Cleaning up metrics subscription');
      unsubscribe();
      clearInterval(updateRoutePoints);
    };
  }, [isTracking]);

  const handleStart = async () => {
    try {
      // Check if there's already an activity in progress
      if (ActivityService.isActivityInProgress()) {
        console.log('Activity already in progress, stopping it first');
        try {
          await ActivityService.stopActivity();
        } catch (e) {
          console.log('Error stopping previous activity:', e);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Stop foreground-only tracking before starting activity with background tracking
      if (locationService.isCurrentlyTracking()) {
        console.log('Stopping foreground tracking before starting activity');
        await locationService.stopTracking();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Set start time for local timer
      const startTime = Date.now();
      setActivityStartTime(startTime);

      await ActivityService.startActivity(activityType, true);
      setIsTracking(true);
      setIsPaused(false);

      // Reset audio announcement service for new activity
      AudioAnnouncementService.reset();
    } catch (error) {
      console.error('Error starting activity:', error);
      showConfirm(
        'Error',
        'Failed to start tracking',
        [{ text: 'OK', onPress: hideModal, style: 'default' }],
        { icon: 'alert-circle', iconColor: colors.error }
      );
    }
  };

  const handlePause = async () => {
    if (!ActivityService.isActivityInProgress()) {
      showConfirm(
        'Error',
        'No activity in progress',
        [{ text: 'OK', onPress: hideModal, style: 'default' }],
        { icon: 'alert-circle', iconColor: colors.error }
      );
      return;
    }

    try {
      const pauseTime = Date.now();
      setLastPauseTime(pauseTime);

      await ActivityService.pauseActivity();
      setIsPaused(true);
    } catch (error) {
      console.error('Error pausing activity:', error);
      showConfirm(
        'Error',
        'Failed to pause activity',
        [{ text: 'OK', onPress: hideModal, style: 'default' }],
        { icon: 'alert-circle', iconColor: colors.error }
      );
    }
  };

  const handleResume = async () => {
    try {
      const pauseDuration = Date.now() - lastPauseTime;
      setPausedTime(prev => prev + pauseDuration);
      setLastPauseTime(0);

      await ActivityService.resumeActivity();
      setIsPaused(false);
    } catch (error) {
      console.error('Error resuming activity:', error);
      showConfirm(
        'Error',
        'Failed to resume activity',
        [{ text: 'OK', onPress: hideModal, style: 'default' }],
        { icon: 'alert-circle', iconColor: colors.error }
      );
    }
  };

  const handleStop = async () => {
    showConfirm(
      'Stop Activity',
      'Do you want to save this activity?',
      [
        { text: 'Cancel', onPress: hideModal, style: 'cancel' },
        {
          text: 'Discard',
          onPress: async () => {
            try {
              if (ActivityService.isActivityInProgress()) {
                await ActivityService.discardActivity();
              }
              AudioAnnouncementService.stop();
              await resetState();
              hideModal();
            } catch (error) {
              console.error('Error discarding activity:', error);
              await resetState();
              hideModal();
            }
          },
          style: 'destructive',
        },
        {
          text: 'Save',
          onPress: async () => {
            try {
              await ActivityService.stopActivity();
              await resetState();
              hideModal();
              setTimeout(() => {
                showConfirm(
                  'Success',
                  'Activity saved!',
                  [{ text: 'OK', onPress: hideModal, style: 'default' }],
                  { icon: 'checkmark-circle', iconColor: colors.success }
                );
              }, 300);
            } catch (error) {
              console.error('Error saving activity:', error);
              await resetState();
              hideModal();
            }
          },
          style: 'default',
        },
      ],
      { icon: 'stop-circle', iconColor: colors.error }
    );
  };

  const resetState = async () => {
    setIsTracking(false);
    setIsPaused(false);
    setDuration(0);
    setDistance(0);
    setCurrentPace(0);
    setAveragePace(0);
    setSteps(0);
    setCalories(0);
    setRoutePoints([]);
    setActivityStartTime(0);
    setPausedTime(0);
    setLastPauseTime(0);

    // Clear local timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 500));

    // Restart foreground-only tracking for map display
    try {
      const hasPermission = await locationService.hasPermissions();
      if (hasPermission && !locationService.isCurrentlyTracking()) {
        console.log('Restarting foreground location tracking for map');
        await locationService.startTracking(false);
      } else if (locationService.isCurrentlyTracking()) {
        console.log('Location tracking already active, not restarting');
      }
    } catch (error) {
      console.log('Could not restart location tracking:', error);
    }
  };

  const currentPaceColor = getPaceColor(currentPace, colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Map */}
      <View style={styles.mapContainer}>
        <LiveRouteMap
          key={settings.mapType}
          currentLocation={currentLocation}
          routePoints={routePoints}
          isTracking={isTracking && !isPaused}
        />
      </View>

      {/* ── Unified Top Overlay ────────────────────────────────── */}
      <SafeAreaView style={styles.topOverlay} edges={['top']} pointerEvents="box-none">
        {/* Status row */}
        <View style={styles.statusRow} pointerEvents="box-none">
          {!isTracking && onBack && (
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}
              onPress={onBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          {isTracking && !isPaused && (
            <View style={[styles.statusBadge, { backgroundColor: colors.success }]}>
              <View style={styles.recordingDot} />
              <Text style={styles.statusText}>Recording</Text>
            </View>
          )}
          {isPaused && (
            <View style={[styles.statusBadge, { backgroundColor: colors.warning }]}>
              <Ionicons name="pause" size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.statusText}>Paused</Text>
            </View>
          )}
        </View>

        {/* Hero: Duration | Distance */}
        <View style={[styles.heroRow, { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
          <View style={styles.heroMetric}>
            <Text style={[styles.heroValue, { color: colors.textPrimary }]}>{formatDuration(duration)}</Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Duration</Text>
          </View>
          <View style={[styles.heroDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]} />
          <View style={styles.heroMetric}>
            <Text style={[styles.heroValue, { color: colors.textPrimary }]}>{formatDistance(distance, settings.units)}</Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Distance</Text>
          </View>
        </View>

        {/* Secondary stats */}
        <View style={[styles.statsStrip, { backgroundColor: isDark ? 'rgba(40, 40, 40, 0.90)' : 'rgba(255, 255, 255, 0.92)' }]}>
          <View style={styles.stripItem}>
            <View style={styles.stripIconRow}>
              <Ionicons name="flash" size={14} color={currentPaceColor} />
              {isTracking && !isPaused && (
                <Animated.View style={[styles.liveDot, { opacity: pulseAnim, backgroundColor: currentPaceColor }]} />
              )}
            </View>
            <Text style={[styles.stripValue, { color: currentPaceColor }]}>
              {currentPace > 0 ? formatPace(currentPace, settings.units).split(' ')[0] : '--:--'}
            </Text>
            <Text style={[styles.stripLabel, { color: colors.textSecondary }]}>Pace</Text>
          </View>

          <View style={[styles.stripDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }]} />

          <View style={styles.stripItem}>
            <Ionicons name="speedometer-outline" size={14} color={colors.primary} />
            <Text style={[styles.stripValue, { color: colors.textPrimary }]}>
              {averagePace > 0 ? formatPace(averagePace, settings.units).split(' ')[0] : '--:--'}
            </Text>
            <Text style={[styles.stripLabel, { color: colors.textSecondary }]}>Avg Pace</Text>
          </View>

          <View style={[styles.stripDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }]} />

          <View style={styles.stripItem}>
            <Ionicons name="footsteps-outline" size={14} color={colors.primary} />
            <Text style={[styles.stripValue, { color: colors.textPrimary }]}>{steps.toLocaleString()}</Text>
            <Text style={[styles.stripLabel, { color: colors.textSecondary }]}>Steps</Text>
          </View>

          <View style={[styles.stripDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }]} />

          <View style={styles.stripItem}>
            <Ionicons name="flame-outline" size={14} color="#FF6B6B" />
            <Text style={[styles.stripValue, { color: colors.textPrimary }]}>{Math.round(calories)}</Text>
            <Text style={[styles.stripLabel, { color: colors.textSecondary }]}>Cal</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* ── Bottom Controls ────────────────────────────────────── */}
      <SafeAreaView style={[styles.bottomContainer, { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.96)' : 'rgba(255, 255, 255, 0.96)' }]} edges={['bottom']}>
        {!isTracking ? (
          <View style={styles.startContainer}>
            <TouchableOpacity
              style={[
                styles.startButton,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                },
              ]}
              onPress={handleStart}
              activeOpacity={0.85}
            >
              <Ionicons name="play" size={26} color="#fff" />
              <Text style={styles.startButtonText}>Start Activity</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.controlButton, styles.pauseButton, { backgroundColor: colors.warning }]}
              onPress={isPaused ? handleResume : handlePause}
              activeOpacity={0.85}
            >
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={22}
                color="#fff"
              />
              <Text style={styles.controlButtonText}>
                {isPaused ? 'Resume' : 'Pause'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton, { backgroundColor: colors.error }]}
              onPress={handleStop}
              activeOpacity={0.85}
            >
              <Ionicons name="stop" size={22} color="#fff" />
              <Text style={styles.controlButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      <ConfirmModal
        visible={modalState.visible}
        title={modalState.title}
        message={modalState.message}
        icon={modalState.icon as any}
        iconColor={modalState.iconColor}
        buttons={modalState.buttons}
        loading={modalState.loading}
        loadingMessage={modalState.loadingMessage}
        onRequestClose={hideModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop:
      Platform.OS === 'android'
        ? (StatusBar.currentHeight || 20)
        : 0,
  },
  mapContainer: {
    flex: 1,
  },

  // ── Unified top overlay ──────────────────────────────────────────────────
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },

  // ── Hero metrics ────────────────────────────────────────────────────────
  heroRow: {
    flexDirection: 'row',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  heroMetric: {
    flex: 1,
    alignItems: 'center',
  },
  heroValue: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.5,
  },
  heroLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 32,
  },

  // ── Secondary stats strip ───────────────────────────────────────────────
  statsStrip: {
    flexDirection: 'row',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  stripItem: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  stripIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  stripValue: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.3,
  },
  stripLabel: {
    fontSize: 9,
    fontFamily: 'Poppins_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stripDivider: {
    width: 1,
    height: 24,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  // ── Bottom controls ─────────────────────────────────────────────────────
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  startContainer: {
    alignItems: 'center',
  },
  startButton: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  startIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pauseButton: {},
  stopButton: {},
  controlButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});