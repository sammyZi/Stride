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
import BatteryOptimizationService from '../../services/battery/BatteryOptimizationService';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import { useSettings } from '../../context';
import { formatDuration, formatDistance, formatPace, formatCalories } from '../../utils';
import { Colors } from '../../constants/theme';
import { ActivityType } from '../../types';

const { width } = Dimensions.get('window');

// Helper: color-coded pace indicator
const getPaceColor = (paceSecondsPerKm: number): string => {
  if (paceSecondsPerKm <= 0) return Colors.textSecondary;
  if (paceSecondsPerKm < 360) return '#00D9A3';  // Fast — green
  if (paceSecondsPerKm < 600) return '#4ECDC4';  // Good — teal
  if (paceSecondsPerKm < 900) return Colors.warning;  // Moderate — orange
  return Colors.error;  // Slow — red
};

interface ActivityTrackingScreenProps {
  onBack?: () => void;
}

export const ActivityTrackingScreen: React.FC<ActivityTrackingScreenProps> = ({ onBack }) => {
  const { modalState, showConfirm, hideModal } = useConfirmModal();
  const { settings } = useSettings();
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

  // Pulse animation for live pace indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
          { icon: 'alert-circle', iconColor: Colors.warning }
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

    // Subscribe to location updates
    locationService.onLocationUpdate((location) => {
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

    const locationUnsubscribe = locationService.onLocationUpdate((location) => {
      setCurrentLocation(location);
    });

    const updateRoutePoints = setInterval(() => {
      const activity = ActivityService.getCurrentActivity();
      if (activity) {
        setRoutePoints(activity.route);
      }
    }, 1000);

    return () => {
      console.log('Cleaning up metrics subscription');
      unsubscribe();
      locationUnsubscribe();
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
        { icon: 'alert-circle', iconColor: Colors.error }
      );
    }
  };

  const handlePause = async () => {
    if (!ActivityService.isActivityInProgress()) {
      showConfirm(
        'Error',
        'No activity in progress',
        [{ text: 'OK', onPress: hideModal, style: 'default' }],
        { icon: 'alert-circle', iconColor: Colors.error }
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
        { icon: 'alert-circle', iconColor: Colors.error }
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
        { icon: 'alert-circle', iconColor: Colors.error }
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
                  { icon: 'checkmark-circle', iconColor: Colors.success }
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
      { icon: 'stop-circle', iconColor: Colors.error }
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

  const currentPaceColor = getPaceColor(currentPace);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Map */}
      <View style={styles.mapContainer}>
        <LiveRouteMap
          key={settings.mapType}
          currentLocation={currentLocation}
          routePoints={routePoints}
          isTracking={isTracking && !isPaused}
        />
      </View>

      {/* Top Bar with Status */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <View style={styles.topBarContent}>
          {!isTracking && onBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          )}
          {isTracking && !isPaused && (
            <View style={styles.statusBadge}>
              <View style={styles.recordingDot} />
              <Text style={styles.statusText}>Recording</Text>
            </View>
          )}
          {isPaused && (
            <View style={[styles.statusBadge, styles.pausedBadge]}>
              <Text style={styles.statusText}>Paused</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Compact Metrics Overlay */}
      <SafeAreaView style={styles.metricsContainer} edges={['top']}>
        {/* Row 1: Time | Distance | Steps */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <View style={styles.metricInner}>
              <Ionicons name="time-outline" size={16} color={Colors.primary} />
              <Text style={styles.metricValue}>{formatDuration(duration)}</Text>
            </View>
            <Text style={styles.metricLabel}>Time</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricInner}>
              <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
              <Text style={styles.metricValue}>{formatDistance(distance, settings.units)}</Text>
            </View>
            <Text style={styles.metricLabel}>Distance</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricInner}>
              <Ionicons name="footsteps-outline" size={16} color={Colors.primary} />
              <Text style={styles.metricValue}>{steps.toLocaleString()}</Text>
            </View>
            <Text style={styles.metricLabel}>Steps</Text>
          </View>
        </View>

        {/* Row 2: Current Pace | Avg Pace | Calories */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, styles.paceCard, { borderLeftColor: currentPaceColor }]}>
            <View style={styles.metricInner}>
              <Ionicons name="flash" size={16} color={currentPaceColor} />
              {isTracking && !isPaused && (
                <Animated.View style={[styles.liveDot, { opacity: pulseAnim, backgroundColor: currentPaceColor }]} />
              )}
              <Text style={[styles.metricValue, { color: currentPaceColor }]}>
                {currentPace > 0 ? formatPace(currentPace, settings.units).split(' ')[0] : '--:--'}
              </Text>
            </View>
            <Text style={styles.metricLabel}>Current</Text>
          </View>
          <View style={[styles.metricCard, styles.avgPaceCard]}>
            <View style={styles.metricInner}>
              <Ionicons name="speedometer" size={16} color={Colors.primary} />
              <Text style={styles.metricValue}>
                {averagePace > 0 ? formatPace(averagePace, settings.units).split(' ')[0] : '--:--'}
              </Text>
            </View>
            <Text style={styles.metricLabel}>Avg Pace</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricInner}>
              <Ionicons name="flame" size={16} color="#FF6B6B" />
              <Text style={styles.metricValue}>{Math.round(calories)}</Text>
            </View>
            <Text style={styles.metricLabel}>Calories</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Bottom Controls */}
      <SafeAreaView style={styles.bottomContainer} edges={['bottom']}>
        {!isTracking ? (
          <View style={styles.startContainer}>
            {/* Start Button */}
            <TouchableOpacity style={styles.startButton} onPress={handleStart}>
              <Ionicons name="play" size={32} color="#fff" />
              <Text style={styles.startButtonText}>Start Activity</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.controlsRow}>
            {/* Pause/Resume Button */}
            <TouchableOpacity
              style={[styles.controlButton, styles.pauseButton]}
              onPress={isPaused ? handleResume : handlePause}
            >
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={24}
                color="#fff"
              />
              <Text style={styles.controlButtonText}>
                {isPaused ? 'Resume' : 'Pause'}
              </Text>
            </TouchableOpacity>

            {/* Stop Button */}
            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={handleStop}
            >
              <Ionicons name="stop" size={24} color="#fff" />
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
    backgroundColor: '#fff',
    paddingTop:
      Platform.OS === 'android'
        ? (StatusBar.currentHeight || 20)
        : 0,

  },
  mapContainer: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBarContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pausedBadge: {
    backgroundColor: Colors.warning,
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
  metricsContainer: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    paddingTop: 60,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  metricInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  avgPaceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D9A3',
    marginLeft: 2,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
  },
  startContainer: {
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: Colors.primary,
    width: '100%',
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
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
    gap: 16,
  },
  controlButton: {
    flex: 1,
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pauseButton: {
    backgroundColor: Colors.warning,
  },
  stopButton: {
    backgroundColor: Colors.error,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});