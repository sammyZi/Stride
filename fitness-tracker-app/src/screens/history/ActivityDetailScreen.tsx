/**
 * ActivityDetailScreen
 * Displays complete activity information with route map, metrics, and actions
 * Premium flat editorial design — no shadows, no cards, no gradients
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Platform,
  InteractionManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { Spacing, BorderRadius } from '../../constants/theme';
import StorageService from '../../services/storage/StorageService';
import { useActivitySharing } from '../../hooks/useActivitySharing';
import { useTheme } from '../../hooks';

// Activity type config for icons
const ACTIVITY_CONFIG: Record<string, { icon: string }> = {
  running: { icon: 'fitness' },
  walking: { icon: 'walk' },
  default: { icon: 'fitness' },
};

const getActivityConfig = (type: string) =>
  ACTIVITY_CONFIG[type] || ACTIVITY_CONFIG.default;

export const ActivityDetailScreen: React.FC<any> = ({
  route,
  navigation,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);

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
  const [mapReady, setMapReady] = useState(false);

  const activityCardRef = useRef<View>(null);
  const shareCardRef = useRef<View>(null);

  const {
    shareActivityText,
    shareActivityImage,
    isSharing,
  } = useActivitySharing();

  // Load data after navigation animation completes to prevent lag
  useEffect(() => {
    let mounted = true;

    const task = InteractionManager.runAfterInteractions(async () => {
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
          // Defer map rendering to avoid jank
          setTimeout(() => mounted && setMapReady(true), 300);
        }
      } catch (error) {
        console.error('Error loading activity:', error);
        if (mounted) {
          setIsReady(true);
        }
      }
    });

    return () => {
      mounted = false;
      task.cancel();
    };
  }, [activityId]);

  // Memoize computed values
  const computedStats = useMemo(() => {
    if (!activity) return null;
    return {
      speed: ((activity.distance / 1000) / (activity.duration / 3600)).toFixed(1),
      cadence: Math.round((activity.steps / activity.duration) * 60),
      stride: ((activity.distance / activity.steps) * 100).toFixed(0),
      avgAccuracy: (activity.route.reduce((sum, p) => sum + p.accuracy, 0) / activity.route.length).toFixed(1),
    };
  }, [activity]);

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
  };

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
      setGeneratingImage(true);
      setRenderShareCard(true);

      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!shareCardRef.current) {
        throw new Error('Share card not rendered');
      }

      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

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

  const shareOptions: ShareOption[] = useMemo(() => [
    {
      id: 'image',
      label: 'Share as Image',
      icon: 'image-outline',
      color: colors.primary,
      onPress: handleShareAsImage,
    },
    {
      id: 'text',
      label: 'Share as Text',
      icon: 'text-outline',
      color: colors.success,
      onPress: handleShareAsText,
    },
  ], [colors, handleShareAsImage, handleShareAsText]);

  // ── Shared header for loading/error states ──
  const renderHeader = (showActions = false) => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text variant="mediumLarge" weight="semiBold" color={colors.textPrimary}>
        Activity
      </Text>
      {showActions ? (
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleDelete} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.headerButtonPlaceholder} />
      )}
    </View>
  );

  // Show loading state
  if (!isReady) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
        <View style={styles.statusBarSpacer} />
        {renderHeader()}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // Show error state
  if (!activity) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
        <View style={styles.statusBarSpacer} />
        {renderHeader()}
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Ionicons name="alert-circle-outline" size={44} color={colors.disabled} />
          </View>
          <Text variant="regular" weight="medium" color={colors.textSecondary} style={{ marginTop: Spacing.md }}>
            Activity not found
          </Text>
        </View>
      </View>
    );
  }

  const config = getActivityConfig(activity.type);
  const accentColor = (activity.type as string) === 'running' ? colors.success : (activity.type as string) === 'walking' ? colors.warning : colors.primary;
  const distanceParts = formatDistance(activity.distance, units, 2).split(' ');
  const paceParts = formatPace(activity.averagePace, units).split(' ');

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
      <View style={styles.statusBarSpacer} />
      {renderHeader(true)}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Capturable Activity Card */}
        <View ref={activityCardRef} style={styles.capturable} collapsable={false}>

          {/* ── Hero Section ── */}
          <View style={styles.heroSection}>
            <View style={styles.heroTop}>
              <View style={[styles.activityBadge, { backgroundColor: accentColor + '15' }]}>
                <Ionicons name={config.icon as any} size={20} color={accentColor} />
                <Text variant="small" weight="semiBold" color={accentColor} style={{ marginLeft: 6 }}>
                  {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                </Text>
              </View>
              <Text variant="small" color={colors.textSecondary}>
                {formatDateTime(activity.startTime)}
              </Text>
            </View>

            {/* Big distance number */}
            <View style={styles.heroMetric}>
              <Text style={styles.heroValue}>{distanceParts[0]}</Text>
              <Text variant="regular" weight="medium" color={colors.textSecondary} style={{ marginLeft: 6, marginBottom: 10 }}>
                {distanceParts[1]}
              </Text>
            </View>

            {/* Quick stats row */}
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text variant="extraSmall" color={colors.textSecondary} style={styles.heroStatLabel}>
                  Duration
                </Text>
                <Text variant="mediumLarge" weight="bold" color={colors.textPrimary}>
                  {formatDuration(activity.duration)}
                </Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text variant="extraSmall" color={colors.textSecondary} style={styles.heroStatLabel}>
                  Pace
                </Text>
                <Text variant="mediumLarge" weight="bold" color={colors.textPrimary}>
                  {paceParts[0]}
                </Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text variant="extraSmall" color={colors.textSecondary} style={styles.heroStatLabel}>
                  Calories
                </Text>
                <Text variant="mediumLarge" weight="bold" color={colors.textPrimary}>
                  {Math.round(activity.calories)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionDivider} />

          {/* ── Key Metrics ── */}
          <View style={styles.section}>
            <Text variant="extraSmall" weight="semiBold" color={colors.primary} style={styles.sectionLabel}>
              KEY METRICS
            </Text>
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <View style={[styles.metricIconWrap, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="footsteps-outline" size={16} color={colors.primary} />
                  </View>
                  <Text variant="extraSmall" weight="medium" color={colors.textSecondary}>Steps</Text>
                </View>
                <Text variant="mediumLarge" weight="bold" color={colors.textPrimary}>
                  {activity.steps.toLocaleString()}
                </Text>
              </View>
              {computedStats && (
                <>
                  <View style={styles.metricItem}>
                    <View style={styles.metricHeader}>
                      <View style={[styles.metricIconWrap, { backgroundColor: colors.success + '15' }]}>
                        <Ionicons name="speedometer-outline" size={16} color={colors.success} />
                      </View>
                      <Text variant="extraSmall" weight="medium" color={colors.textSecondary}>Speed</Text>
                    </View>
                    <Text variant="mediumLarge" weight="bold" color={colors.textPrimary}>
                      {computedStats.speed}
                      <Text variant="extraSmall" color={colors.textSecondary}>
                        {' '}{units === 'metric' ? 'km/h' : 'mph'}
                      </Text>
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <View style={styles.metricHeader}>
                      <View style={[styles.metricIconWrap, { backgroundColor: colors.info + '15' }]}>
                        <Ionicons name="pulse-outline" size={16} color={colors.info} />
                      </View>
                      <Text variant="extraSmall" weight="medium" color={colors.textSecondary}>Cadence</Text>
                    </View>
                    <Text variant="mediumLarge" weight="bold" color={colors.textPrimary}>
                      {computedStats.cadence}
                      <Text variant="extraSmall" color={colors.textSecondary}> spm</Text>
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <View style={styles.metricHeader}>
                      <View style={[styles.metricIconWrap, { backgroundColor: colors.warning + '15' }]}>
                        <Ionicons name="resize-outline" size={16} color={colors.warning} />
                      </View>
                      <Text variant="extraSmall" weight="medium" color={colors.textSecondary}>Stride</Text>
                    </View>
                    <Text variant="mediumLarge" weight="bold" color={colors.textPrimary}>
                      {computedStats.stride}
                      <Text variant="extraSmall" color={colors.textSecondary}> cm</Text>
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          <View style={styles.sectionDivider} />

          {/* ── Route Map ── */}
          <View style={styles.section}>
            <View style={styles.mapHeaderRow}>
              <View>
                <Text variant="extraSmall" weight="semiBold" color={colors.primary} style={styles.sectionLabel}>
                  ROUTE
                </Text>
                <Text variant="extraSmall" color={colors.textSecondary}>
                  {activity.route.length} GPS points
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.paceToggle, showPaceHeatmap && styles.paceToggleActive]}
                onPress={() => setShowPaceHeatmap(!showPaceHeatmap)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPaceHeatmap ? 'color-palette' : 'color-palette-outline'}
                  size={16}
                  color={showPaceHeatmap ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  variant="extraSmall"
                  weight="medium"
                  color={showPaceHeatmap ? '#FFFFFF' : colors.textSecondary}
                  style={{ marginLeft: 4 }}
                >
                  Pace
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.mapContainer}>
              {mapReady && activity.route && activity.route.length > 0 ? (
                <StaticRouteMap
                  route={activity.route}
                  units={units}
                  showDistanceMarkers={true}
                  showPaceHeatmap={showPaceHeatmap}
                  averagePace={activity.averagePace}
                />
              ) : (
                <View style={styles.mapPlaceholder}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text variant="extraSmall" color={colors.textSecondary} style={{ marginTop: 8 }}>Loading map...</Text>
                </View>
              )}
            </View>

            {/* Map metadata */}
            {computedStats && (
              <View style={styles.mapMeta}>
                <View style={styles.mapMetaItem}>
                  <Ionicons name="locate-outline" size={14} color={colors.success} />
                  <Text variant="extraSmall" color={colors.textSecondary} style={{ marginLeft: 4 }}>
                    {computedStats.avgAccuracy}m accuracy
                  </Text>
                </View>
                {activity.elevationGain !== undefined && activity.elevationGain > 0 && (
                  <View style={styles.mapMetaItem}>
                    <Ionicons name="arrow-up-outline" size={14} color={colors.warning} />
                    <Text variant="extraSmall" color={colors.textSecondary} style={{ marginLeft: 4 }}>
                      +{activity.elevationGain.toFixed(0)}m elevation
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.sectionDivider} />

          {/* ── Details ── */}
          <View style={styles.section}>
            <Text variant="extraSmall" weight="semiBold" color={colors.primary} style={styles.sectionLabel}>
              DETAILS
            </Text>

            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text variant="extraSmall" color={colors.textSecondary}>Date</Text>
                <Text variant="regular" weight="medium" color={colors.textPrimary}>
                  {formatDate(activity.startTime, 'long')}
                </Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={18} color={colors.success} />
              <View style={styles.detailContent}>
                <Text variant="extraSmall" color={colors.textSecondary}>Time Range</Text>
                <Text variant="regular" weight="medium" color={colors.textPrimary}>
                  {formatDate(activity.startTime, 'time')} – {formatDate(activity.endTime, 'time')}
                </Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={18} color={colors.info} />
              <View style={styles.detailContent}>
                <Text variant="extraSmall" color={colors.textSecondary}>GPS Tracking</Text>
                <Text variant="regular" weight="medium" color={colors.textPrimary}>
                  {activity.route.length} points · {computedStats?.avgAccuracy}m avg
                </Text>
              </View>
            </View>

            {activity.elevationGain !== undefined && activity.elevationGain > 0 && (
              <>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Ionicons name="trending-up-outline" size={18} color={colors.warning} />
                  <View style={styles.detailContent}>
                    <Text variant="extraSmall" color={colors.textSecondary}>Elevation Gain</Text>
                    <Text variant="regular" weight="medium" color={colors.textPrimary}>
                      {activity.elevationGain.toFixed(0)} meters
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Branding Footer for Shared Image */}
          <View style={styles.brandingFooter}>
            <Ionicons name="fitness" size={16} color={colors.primary} />
            <Text variant="extraSmall" weight="medium" color={colors.disabled} style={{ marginLeft: 6 }}>
              Tracked with Stride
            </Text>
          </View>
        </View>
        {/* End Capturable Card */}
      </ScrollView>

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
            <View style={styles.modalIconWrap}>
              <Ionicons name="trash" size={36} color={colors.error} />
            </View>

            <Text variant="mediumLarge" weight="bold" color={colors.textPrimary} style={styles.modalTitle}>
              Delete Activity
            </Text>

            <Text variant="regular" color={colors.textSecondary} style={styles.modalMessage}>
              Are you sure you want to delete this activity? This action cannot be undone.
            </Text>

            {isDeleting ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.error} />
                <Text variant="regular" color={colors.textSecondary} style={{ marginTop: Spacing.md }}>
                  Deleting...
                </Text>
              </View>
            ) : (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={cancelDelete}
                  activeOpacity={0.7}
                >
                  <Text variant="regular" weight="semiBold" color={colors.textPrimary}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnDelete]}
                  onPress={confirmDelete}
                  activeOpacity={0.7}
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
  );
};

const createStyles = (colors: any, insetTop: number) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  statusBarSpacer: {
    height: insetTop,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.border + '60',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Header ──
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  headerButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
  headerButtonPlaceholder: {
    width: 38,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 2,
  },

  // ── Scroll ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  capturable: {
    backgroundColor: colors.surface,
  },

  // ── Hero ──
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  heroMetric: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.xl,
  },
  heroValue: {
    fontSize: 56,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    lineHeight: 62,
    includeFontPadding: false,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },

  // ── Sections ──
  section: {
    paddingHorizontal: 20,
    paddingVertical: Spacing.xl,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: Spacing.lg,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },

  // ── Key Metrics ──
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricItem: {
    width: '47%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: colors.background,
    borderRadius: 14,
    gap: 6,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Map ──
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  paceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
  },
  paceToggleActive: {
    backgroundColor: colors.primary,
  },
  mapContainer: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapMeta: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  mapMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ── Details ──
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  detailContent: {
    flex: 1,
    gap: 1,
  },
  detailDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 34,
  },

  // ── Branding ──
  brandingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },

  // ── Off-screen ──
  offscreenContainer: {
    position: 'absolute',
    left: -10000,
    top: 0,
  },

  // ── Delete Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.error + '12',
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
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: colors.background,
  },
  modalBtnDelete: {
    backgroundColor: colors.error,
  },
  modalLoading: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
});
