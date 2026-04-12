/**
 * ActivityDetailScreen
 * Displays complete activity information with route map, metrics, and actions
 */

import React, { useState, useRef, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import { Text, ShareModal, ShareOption } from '../../components/common';
import { StaticRouteMap } from '../../components/map';
import { ActivityShareCard } from '../../components/activity/ActivityShareCard';
import { Activity, UnitSystem } from '../../types';
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatDate,
  formatDateTime,
} from '../../utils/formatting';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import StorageService from '../../services/storage/StorageService';
import { useActivitySharing } from '../../hooks/useActivitySharing';

export const ActivityDetailScreen: React.FC<any> = ({
  route,
  navigation,
}) => {
  const { activityId } = route.params;
  const [activity, setActivity] = useState<Activity | null>(null);
  const [units, setUnits] = useState<UnitSystem>('metric');
  const [showPaceHeatmap, setShowPaceHeatmap] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [renderShareCard, setRenderShareCard] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const activityCardRef = useRef<View>(null);
  const shareCardRef = useRef<View>(null);

  const {
    shareActivityText,
    shareActivityImage,
    isSharing,
  } = useActivitySharing();

  // Load data immediately on mount
  useLayoutEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [loadedActivity, settings] = await Promise.all([
          StorageService.getActivity(activityId),
          StorageService.getSettings(),
        ]);

        if (mounted) {
          setActivity(loadedActivity);
          if (settings) {
            setUnits(settings.units);
          }
          setIsReady(true);
        }
      } catch (error) {
        console.error('Error loading activity:', error);
        if (mounted) {
          setIsReady(true);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [activityId]);

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      await StorageService.deleteActivity(activityId);
      setShowDeleteModal(false);

      // Navigate back and trigger refresh
      navigation.navigate('ActivityHistory', { refresh: true });
    } catch (error) {
      console.error('Error deleting activity:', error);
      setIsDeleting(false);
    }
  }

  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  const handleShare = () => {
    if (!activity) return;
    setShowShareModal(true);
  };

  const handleShareAsImage = async () => {
    if (!activity) return;

    try {
      // Show loading state
      setGeneratingImage(true);

      // Render the share card off-screen
      setRenderShareCard(true);

      // Wait longer for map to fully render with route
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!shareCardRef.current) {
        throw new Error('Share card not rendered');
      }

      // Capture the custom share card as maximum quality image
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1.0, // Maximum quality
        result: 'tmpfile',
      });

      // Hide the share card
      setRenderShareCard(false);
      setGeneratingImage(false);

      await shareActivityImage(uri);
    } catch (error) {
      console.error('Error sharing as image:', error);
      setRenderShareCard(false);
      setGeneratingImage(false);
    }
  };

  const handleShareAsText = async () => {
    if (!activity) return;

    try {
      await shareActivityText(activity, units);
    } catch (error) {
      console.error('Error sharing as text:', error);
    }
  };

  const shareOptions: ShareOption[] = [
    {
      id: 'image',
      label: 'Share as Image',
      icon: 'image-outline',
      color: Colors.primary,
      onPress: handleShareAsImage,
    },
    {
      id: 'text',
      label: 'Share as Text',
      icon: 'text-outline',
      color: Colors.success,
      onPress: handleShareAsText,
    },
  ];

  const getActivityIcon = () => {
    return 'fitness';
  };

  const getActivityColor = () => {
    return Colors.primary;
  };

  // Show loading state while data is being fetched
  if (!isReady) {
    return (
      <View style={styles.fullScreenContainer}>
        <View style={styles.container}>
          <View style={styles.statusBarSpacer} />
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text variant="large" weight="bold" color={Colors.textPrimary}>
              Activity Details
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </View>
      </View>
    );
  }

  // Show error state if activity not found after loading
  if (!activity) {
    return (
      <View style={styles.fullScreenContainer}>
        <View style={styles.container}>
          <View style={styles.statusBarSpacer} />
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text variant="large" weight="bold" color={Colors.textPrimary}>
              Activity Details
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loadingContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.textSecondary} />
            <Text variant="regular" color={Colors.textSecondary} style={{ marginTop: Spacing.md }}>
              Activity not found
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fullScreenContainer}>
      <View style={styles.container}>
        <View style={styles.statusBarSpacer} />
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="large" weight="bold" color={Colors.textPrimary}>
          Activity Details
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {activity && (
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Capturable Activity Card */}
          <View ref={activityCardRef} style={styles.capturableCard} collapsable={false}>
            {/* Activity Type and Date */}
            <View style={styles.titleSection}>
              <View style={styles.typeContainer}>
                <View style={[styles.typeIcon, { backgroundColor: getActivityColor() + '20' }]}>
                  <Ionicons
                    name={getActivityIcon() as any}
                    size={32}
                    color={getActivityColor()}
                  />
                </View>
                <View style={styles.titleText}>
                  <Text variant="large" weight="bold" color={Colors.textPrimary}>
                    {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                  </Text>
                  <Text variant="small" color={Colors.textSecondary}>
                    {formatDateTime(activity.startTime)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Main Metrics Grid - Enhanced */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIconContainer, { backgroundColor: Colors.primary + '15' }]}>
                  <Ionicons name="navigate" size={24} color={Colors.primary} />
                </View>
                <Text variant="large" weight="bold" color={Colors.textPrimary} style={styles.metricValue}>
                  {formatDistance(activity.distance, units, 2).split(' ')[0]}
                </Text>
                <Text variant="extraSmall" color={Colors.textSecondary} style={styles.metricUnit}>
                  {formatDistance(activity.distance, units, 2).split(' ')[1]}
                </Text>
                <Text variant="extraSmall" color={Colors.textSecondary} style={styles.metricLabel}>
                  Distance
                </Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconContainer, { backgroundColor: Colors.success + '15' }]}>
                  <Ionicons name="time" size={24} color={Colors.success} />
                </View>
                <Text variant="large" weight="bold" color={Colors.textPrimary} style={styles.metricValue}>
                  {formatDuration(activity.duration)}
                </Text>
                <Text variant="extraSmall" color={Colors.textSecondary} style={styles.metricLabel}>
                  Duration
                </Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconContainer, { backgroundColor: Colors.info + '15' }]}>
                  <Ionicons name="speedometer" size={24} color={Colors.info} />
                </View>
                <Text variant="mediumLarge" weight="bold" color={Colors.textPrimary} style={styles.metricValue}>
                  {formatPace(activity.averagePace, units).split(' ')[0]}
                </Text>
                <Text variant="extraSmall" color={Colors.textSecondary} style={styles.metricLabel}>
                  Pace
                </Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconContainer, { backgroundColor: Colors.primary + '15' }]}>
                  <Ionicons name="footsteps" size={24} color={Colors.primary} />
                </View>
                <Text variant="mediumLarge" weight="bold" color={Colors.textPrimary} style={styles.metricValue}>
                  {activity.steps.toLocaleString()}
                </Text>
                <Text variant="extraSmall" color={Colors.textSecondary} style={styles.metricLabel}>
                  Steps
                </Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconContainer, { backgroundColor: Colors.error + '15' }]}>
                  <Ionicons name="flame" size={24} color={Colors.error} />
                </View>
                <Text variant="mediumLarge" weight="bold" color={Colors.textPrimary} style={styles.metricValue}>
                  {Math.round(activity.calories)}
                </Text>
                <Text variant="extraSmall" color={Colors.textSecondary} style={styles.metricLabel}>
                  Calories
                </Text>
              </View>
            </View>

            {/* Performance Insights */}
            <View style={styles.insightsSection}>
              <Text variant="mediumLarge" weight="semiBold" color={Colors.textPrimary} style={styles.sectionTitle}>
                Performance Insights
              </Text>
              <View style={styles.insightsGrid}>
                <View style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <Ionicons name="trending-up" size={20} color={Colors.success} />
                    <Text variant="small" weight="semiBold" color={Colors.textPrimary}>
                      Speed
                    </Text>
                  </View>
                  <Text variant="mediumLarge" weight="bold" color={Colors.success}>
                    {((activity.distance / 1000) / (activity.duration / 3600)).toFixed(1)}
                  </Text>
                  <Text variant="extraSmall" color={Colors.textSecondary}>
                    {units === 'metric' ? 'km/h' : 'mph'}
                  </Text>
                </View>

                <View style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <Ionicons name="footsteps" size={20} color={Colors.info} />
                    <Text variant="small" weight="semiBold" color={Colors.textPrimary}>
                      Cadence
                    </Text>
                  </View>
                  <Text variant="mediumLarge" weight="bold" color={Colors.info}>
                    {Math.round((activity.steps / activity.duration) * 60)}
                  </Text>
                  <Text variant="extraSmall" color={Colors.textSecondary}>
                    steps/min
                  </Text>
                </View>

                <View style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <Ionicons name="resize" size={20} color={Colors.warning} />
                    <Text variant="small" weight="semiBold" color={Colors.textPrimary}>
                      Stride
                    </Text>
                  </View>
                  <Text variant="mediumLarge" weight="bold" color={Colors.warning}>
                    {((activity.distance / activity.steps) * 100).toFixed(0)}
                  </Text>
                  <Text variant="extraSmall" color={Colors.textSecondary}>
                    cm/step
                  </Text>
                </View>
              </View>
            </View>

            {/* Route Map - Lazy loaded */}
            <View style={styles.mapSection}>
              <View style={styles.mapHeader}>
                <View>
                  <Text variant="mediumLarge" weight="semiBold" color={Colors.textPrimary}>
                    Route Map
                  </Text>
                  <Text variant="extraSmall" color={Colors.textSecondary}>
                    {activity.route.length} GPS points tracked
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.heatmapToggle, showPaceHeatmap && styles.heatmapToggleActive]}
                  onPress={() => setShowPaceHeatmap(!showPaceHeatmap)}
                >
                  <Ionicons
                    name={showPaceHeatmap ? 'color-palette' : 'color-palette-outline'}
                    size={18}
                    color={showPaceHeatmap ? '#FFFFFF' : Colors.textSecondary}
                  />
                  <Text
                    variant="extraSmall"
                    weight="medium"
                    color={showPaceHeatmap ? '#FFFFFF' : Colors.textSecondary}
                  >
                    Pace
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.mapContainer}>
                {activity.route && activity.route.length > 0 && (
                  <StaticRouteMap
                    route={activity.route}
                    units={units}
                    showDistanceMarkers={true}
                    showPaceHeatmap={showPaceHeatmap}
                    averagePace={activity.averagePace}
                  />
                )}
              </View>

              {/* Map Stats */}
              <View style={styles.mapStats}>
                <View style={styles.mapStatItem}>
                  <Ionicons name="analytics" size={16} color={Colors.success} />
                  <Text variant="extraSmall" color={Colors.textSecondary}>
                    Accuracy: {(activity.route.reduce((sum, p) => sum + p.accuracy, 0) / activity.route.length).toFixed(1)}m
                  </Text>
                </View>
                {activity.elevationGain !== undefined && activity.elevationGain > 0 && (
                  <View style={styles.mapStatItem}>
                    <Ionicons name="trending-up" size={16} color={Colors.warning} />
                    <Text variant="extraSmall" color={Colors.textSecondary}>
                      Elevation: +{activity.elevationGain.toFixed(0)}m
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Activity Details */}
            <View style={styles.statsSection}>
              <Text variant="mediumLarge" weight="semiBold" color={Colors.textPrimary} style={styles.sectionTitle}>
                Activity Details
              </Text>
              <View style={styles.statsList}>
                <View style={styles.statRow}>
                  <View style={styles.statIconWrapper}>
                    <Ionicons name="calendar" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.statContent}>
                    <Text variant="extraSmall" color={Colors.textSecondary}>
                      Date
                    </Text>
                    <Text variant="regular" weight="semiBold" color={Colors.textPrimary}>
                      {formatDate(activity.startTime, 'long')}
                    </Text>
                  </View>
                </View>

                <View style={styles.statRow}>
                  <View style={styles.statIconWrapper}>
                    <Ionicons name="time-outline" size={18} color={Colors.success} />
                  </View>
                  <View style={styles.statContent}>
                    <Text variant="extraSmall" color={Colors.textSecondary}>
                      Time Range
                    </Text>
                    <Text variant="regular" weight="semiBold" color={Colors.textPrimary}>
                      {formatDate(activity.startTime, 'time')} - {formatDate(activity.endTime, 'time')}
                    </Text>
                  </View>
                </View>

                <View style={styles.statRow}>
                  <View style={styles.statIconWrapper}>
                    <Ionicons name="location" size={18} color={Colors.info} />
                  </View>
                  <View style={styles.statContent}>
                    <Text variant="extraSmall" color={Colors.textSecondary}>
                      GPS Tracking
                    </Text>
                    <Text variant="regular" weight="semiBold" color={Colors.textPrimary}>
                      {activity.route.length} points • {(activity.route.reduce((sum, p) => sum + p.accuracy, 0) / activity.route.length).toFixed(1)}m accuracy
                    </Text>
                  </View>
                </View>

                {activity.elevationGain !== undefined && activity.elevationGain > 0 && (
                  <View style={styles.statRow}>
                    <View style={styles.statIconWrapper}>
                      <Ionicons name="trending-up" size={18} color={Colors.warning} />
                    </View>
                    <View style={styles.statContent}>
                      <Text variant="extraSmall" color={Colors.textSecondary}>
                        Elevation Gain
                      </Text>
                      <Text variant="regular" weight="semiBold" color={Colors.textPrimary}>
                        {activity.elevationGain.toFixed(0)} meters
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Branding Footer for Shared Image */}
            <View style={styles.brandingFooter}>
              <Ionicons name="fitness" size={20} color={Colors.primary} />
              <Text variant="small" color={Colors.textSecondary} style={styles.brandingText}>
                Tracked with Stride
              </Text>
            </View>
          </View>
          {/* End Capturable Card */}
        </Animated.ScrollView>
      )}

      {/* Share Modal */}
      <ShareModal
        visible={showShareModal || generatingImage}
        onClose={() => !generatingImage && setShowShareModal(false)}
        title={generatingImage ? "Generating Image..." : "Share Activity"}
        options={shareOptions}
        loading={isSharing || generatingImage}
        loadingMessage={generatingImage ? "Creating high-quality image with route map" : "Sharing..."}
      />

      {/* Off-screen Share Card for Image Generation */}
      {renderShareCard && activity && (
        <View style={styles.offscreenContainer}>
          <View ref={shareCardRef} collapsable={false}>
            <ActivityShareCard activity={activity} units={units} />
          </View>
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="trash" size={48} color={Colors.error} />
            </View>

            <Text variant="large" weight="bold" color={Colors.textPrimary} style={styles.modalTitle}>
              Delete Activity
            </Text>

            <Text variant="regular" color={Colors.textSecondary} style={styles.modalMessage}>
              Are you sure you want to delete this activity? This action cannot be undone.
            </Text>

            {isDeleting ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={Colors.error} />
                <Text variant="regular" color={Colors.textSecondary} style={styles.modalLoadingText}>
                  Deleting...
                </Text>
              </View>
            ) : (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={cancelDelete}
                >
                  <Text variant="regular" weight="semiBold" color={Colors.textPrimary}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonDelete]}
                  onPress={confirmDelete}
                >
                  <Text variant="regular" weight="semiBold" color="#FFFFFF">
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 44,
  },
  statusBarSpacer: {
    height: 0, // Padding is on container now
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturableCard: {
    backgroundColor: '#F5F5F5',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerSpacer: {
    width: 80,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  titleSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    backgroundColor: '#FFFFFF',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  titleText: {
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
    ...Shadows.small,
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  metricValue: {
    marginTop: Spacing.xs,
    marginBottom: 2,
  },
  metricUnit: {
    marginTop: -2,
    marginBottom: Spacing.xs,
  },
  metricLabel: {
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  insightsSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  insightsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  insightCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.small,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  mapSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  heatmapToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  heatmapToggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  mapContainer: {
    height: 320,
    borderRadius: BorderRadius.large,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  mapStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  mapStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statsSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  statsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.large,
    padding: Spacing.md,
    ...Shadows.small,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.medium,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  brandingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  brandingText: {
    marginLeft: Spacing.xs,
  },
  offscreenContainer: {
    position: 'absolute',
    left: -10000,
    top: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...Shadows.large,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  modalMessage: {
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.border,
  },
  modalButtonDelete: {
    backgroundColor: Colors.error,
  },
  modalLoadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  modalLoadingText: {
    marginTop: Spacing.md,
  },
});
