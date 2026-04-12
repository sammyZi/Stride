/**
 * ActivitySummaryCard
 * Shareable activity summary card component
 * Can be captured as an image for social media sharing
 */

import React, { useRef } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../common';
import { Activity, UnitSystem } from '../../types';
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatDate,
} from '../../utils/formatting';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

interface ActivitySummaryCardProps {
  activity: Activity;
  units: UnitSystem;
  style?: ViewStyle;
}

export const ActivitySummaryCard: React.FC<ActivitySummaryCardProps> = ({
  activity,
  units,
  style,
}) => {
  const getActivityIcon = () => {
    return 'fitness';
  };

  const getActivityColor = () => {
    return Colors.primary;
  };

  const activityType = activity.type.charAt(0).toUpperCase() + activity.type.slice(1);

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: getActivityColor() + '20' }]}>
          <Ionicons
            name={getActivityIcon() as any}
            size={40}
            color={getActivityColor()}
          />
        </View>
        <View style={styles.headerText}>
          <Text variant="large" weight="bold" color={Colors.textPrimary}>
            {activityType}
          </Text>
          <Text variant="small" color={Colors.textSecondary}>
            {formatDate(activity.startTime, 'long')}
          </Text>
        </View>
      </View>

      {/* Main Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.primaryMetric}>
          <Text variant="extraLarge" weight="bold" color={getActivityColor()}>
            {formatDistance(activity.distance, units, 2).split(' ')[0]}
          </Text>
          <Text variant="regular" color={Colors.textSecondary}>
            {formatDistance(activity.distance, units, 2).split(' ')[1]}
          </Text>
        </View>

        <View style={styles.secondaryMetrics}>
          <View style={styles.metricRow}>
            <Ionicons name="time" size={20} color={Colors.textSecondary} />
            <Text variant="regular" color={Colors.textPrimary}>
              {formatDuration(activity.duration)}
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Ionicons name="speedometer" size={20} color={Colors.textSecondary} />
            <Text variant="regular" color={Colors.textPrimary}>
              {formatPace(activity.averagePace, units)}
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Ionicons name="footsteps" size={20} color={Colors.textSecondary} />
            <Text variant="regular" color={Colors.textPrimary}>
              {activity.steps.toLocaleString()} steps
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Ionicons name="flame" size={20} color={Colors.textSecondary} />
            <Text variant="regular" color={Colors.textPrimary}>
              {Math.round(activity.calories)} cal
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text variant="small" color={Colors.textSecondary}>
          Tracked with Stride 💪
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  metricsContainer: {
    marginBottom: Spacing.xl,
  },
  primaryMetric: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  secondaryMetrics: {
    gap: Spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
