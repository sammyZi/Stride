import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ConfirmModal } from '@/components/common';
import { Activity } from '@/types';
import { StaticRouteMap } from '@/components/map/StaticRouteMap';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import {
  formatDuration,
  formatDistance,
  formatPace,
  formatCalories,
  formatSteps,
  formatDate,
  formatDateTime,
} from '@/utils';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface ActivitySummaryScreenProps {
  activity: Activity;
  onSave: () => void;
  onDiscard: () => void;
}

export const ActivitySummaryScreen: React.FC<ActivitySummaryScreenProps> = ({
  activity,
  onSave,
  onDiscard,
}) => {
  const { modalState, showConfirm, hideModal } = useConfirmModal();
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave();
    } catch (error) {
      console.error('Error saving activity:', error);
      showConfirm(
        'Error',
        'Failed to save activity',
        [{ text: 'OK', onPress: hideModal, style: 'default' }],
        { icon: 'alert-circle', iconColor: Colors.error }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscard = () => {
    showConfirm(
      'Discard Activity',
      'Are you sure you want to discard this activity? This cannot be undone.',
      [
        { text: 'Cancel', onPress: hideModal, style: 'cancel' },
        {
          text: 'Discard',
          onPress: () => {
            hideModal();
            onDiscard();
          },
          style: 'destructive',
        },
      ],
      { icon: 'trash', iconColor: Colors.error }
    );
  };

  const activityTypeIcon = 'fitness';
  const activityTypeColor = Colors.primary;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={[styles.activityTypeIcon, { backgroundColor: activityTypeColor }]}>
              <Ionicons name={activityTypeIcon} size={28} color="#fff" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Activity Complete!</Text>
              <Text style={styles.headerSubtitle}>
                {formatDateTime(activity.startTime)}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Stats Card */}
          <View style={styles.mainStatsCard}>
            <View style={styles.mainStatRow}>
              <View style={styles.mainStat}>
                <Ionicons name="time-outline" size={24} color={Colors.primary} />
                <Text style={styles.mainStatValue}>{formatDuration(activity.duration)}</Text>
                <Text style={styles.mainStatLabel}>Duration</Text>
              </View>

              <View style={styles.mainStat}>
                <Ionicons name="navigate-outline" size={24} color={Colors.primary} />
                <Text style={styles.mainStatValue}>{formatDistance(activity.distance)}</Text>
                <Text style={styles.mainStatLabel}>Distance</Text>
              </View>
            </View>

            <View style={styles.mainStatRow}>
              <View style={styles.mainStat}>
                <Ionicons name="speedometer-outline" size={24} color={Colors.primary} />
                <Text style={styles.mainStatValue}>{formatPace(activity.averagePace)}</Text>
                <Text style={styles.mainStatLabel}>Avg Pace</Text>
              </View>

              <View style={styles.mainStat}>
                <Ionicons name="flame-outline" size={24} color={Colors.primary} />
                <Text style={styles.mainStatValue}>{formatCalories(activity.calories)}</Text>
                <Text style={styles.mainStatLabel}>Calories</Text>
              </View>
            </View>
          </View>

          {/* Additional Stats */}
          <View style={styles.additionalStats}>
            <View style={styles.statItem}>
              <Ionicons name="footsteps-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.statItemLabel}>Steps</Text>
              <Text style={styles.statItemValue}>{activity.steps.toLocaleString()}</Text>
            </View>

            {activity.averagePace > 0 && (
              <View style={styles.statItem}>
                <Ionicons name="speedometer-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.statItemLabel}>Avg Pace</Text>
                <Text style={styles.statItemValue}>{formatPace(activity.averagePace)}</Text>
              </View>
            )}

            {activity.elevationGain && activity.elevationGain > 0 && (
              <View style={styles.statItem}>
                <Ionicons name="trending-up-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.statItemLabel}>Elevation Gain</Text>
                <Text style={styles.statItemValue}>{Math.round(activity.elevationGain)} m</Text>
              </View>
            )}
          </View>

          {/* Route Map */}
          {activity.route.length > 0 && (
            <View style={styles.mapCard}>
              <Text style={styles.sectionTitle}>Your Route</Text>
              <View style={styles.mapContainer}>
                <StaticRouteMap route={activity.route} />
              </View>
              <View style={styles.mapStats}>
                <View style={styles.mapStat}>
                  <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.mapStatText}>{activity.route.length} points</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.discardButton]}
            onPress={handleDiscard}
            disabled={isLoading}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
            <Text style={[styles.buttonText, styles.discardButtonText]}>Discard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={[styles.buttonText, styles.saveButtonText]}>
              {isLoading ? 'Saving...' : 'Save Activity'}
            </Text>
          </TouchableOpacity>
        </View>

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
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: 60,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.fontSize.mediumLarge,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.small,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  mainStatsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  mainStatRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  mainStat: {
    flex: 1,
    alignItems: 'center',
  },
  mainStatValue: {
    fontSize: Typography.fontSize.large,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  mainStatLabel: {
    fontSize: Typography.fontSize.small,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  additionalStats: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statItemLabel: {
    flex: 1,
    fontSize: Typography.fontSize.regular,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  statItemValue: {
    fontSize: Typography.fontSize.regular,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textPrimary,
  },
  mapCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.medium,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  mapContainer: {
    height: 250,
    borderRadius: BorderRadius.medium,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  mapStats: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  mapStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
  },
  mapStatText: {
    fontSize: Typography.fontSize.small,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: BorderRadius.medium,
    gap: Spacing.sm,
  },
  discardButton: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.error,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    ...Shadows.medium,
  },
  buttonText: {
    fontSize: Typography.fontSize.regular,
    fontFamily: Typography.fontFamily.semiBold,
  },
  discardButtonText: {
    color: Colors.error,
  },
  saveButtonText: {
    color: '#fff',
  },
});
