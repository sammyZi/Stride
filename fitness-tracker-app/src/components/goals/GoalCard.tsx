/**
 * GoalCard Component
 * Displays a single goal with circular progress indicator
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../common/Text';
import { Card } from '../common/Card';
import { Goal } from '../../types';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import GoalsService from '../../services/goals/GoalsService';

interface GoalCardProps {
  goal: Goal;
  units: 'metric' | 'imperial';
  onPress?: () => void;
}

const CIRCLE_SIZE = 56;
const CIRCLE_STROKE = 5;
const CIRCLE_RADIUS = (CIRCLE_SIZE - CIRCLE_STROKE) / 2;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export const GoalCard: React.FC<GoalCardProps> = ({ goal, units, onPress }) => {
  const progress = GoalsService.getProgressPercentage(goal);
  const isExpired = goal.endDate < Date.now();
  const isAchieved = goal.achieved;

  const getGoalIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (goal.type) {
      case 'distance':
        return 'navigate';
      case 'frequency':
        return 'fitness';
      case 'duration':
        return 'time';
      default:
        return 'flag';
    }
  };

  const getGoalColor = (): string => {
    if (isAchieved) return Colors.success;
    if (isExpired) return Colors.disabled;
    if (progress >= 75) return Colors.warning;
    return Colors.primary;
  };

  const getGoalLabel = (): string => {
    switch (goal.type) {
      case 'distance':
        return 'Distance';
      case 'frequency':
        return 'Activities';
      case 'duration':
        return 'Duration';
      default:
        return 'Goal';
    }
  };

  const getPeriodLabel = (): string => {
    return goal.period === 'weekly' ? 'Weekly' : 'Monthly';
  };

  const getDaysRemaining = (): string => {
    if (isAchieved) return 'Achieved!';
    if (isExpired) return 'Expired';
    const days = Math.ceil((goal.endDate - Date.now()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Ends today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  };

  const color = getGoalColor();
  const strokeDashoffset = CIRCLE_CIRCUMFERENCE - (CIRCLE_CIRCUMFERENCE * Math.min(progress, 100)) / 100;

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <Card variant="outlined" style={styles.card}>
        <View style={styles.row}>
          {/* Circular Progress */}
          <View style={styles.progressCircleContainer}>
            <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
              {/* Background circle */}
              <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={CIRCLE_RADIUS}
                stroke={`${color}20`}
                strokeWidth={CIRCLE_STROKE}
                fill="transparent"
              />
              {/* Progress arc */}
              <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={CIRCLE_RADIUS}
                stroke={color}
                strokeWidth={CIRCLE_STROKE}
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray={CIRCLE_CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                rotation="-90"
                origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
              />
            </Svg>
            {/* Icon in center */}
            <View style={styles.circleIconOverlay}>
              {isAchieved ? (
                <Ionicons name="checkmark" size={22} color={Colors.success} />
              ) : (
                <Ionicons name={getGoalIcon()} size={20} color={color} />
              )}
            </View>
          </View>

          {/* Goal Info */}
          <View style={styles.info}>
            <View style={styles.labelRow}>
              <Text variant="medium" weight="semiBold" color={Colors.textPrimary}>
                {getGoalLabel()}
              </Text>
              <View style={[styles.periodBadge, { backgroundColor: `${color}15` }]}>
                <Text variant="extraSmall" weight="semiBold" color={color}>
                  {getPeriodLabel()}
                </Text>
              </View>
            </View>

            <View style={styles.progressRow}>
              <Text variant="large" weight="bold" color={Colors.textPrimary}>
                {GoalsService.formatGoalProgress(goal, units)}
              </Text>
              <Text variant="small" color={Colors.textSecondary}>
                {' '}/ {GoalsService.formatGoalTarget(goal, units)}
              </Text>
              <Text variant="small" weight="bold" color={color} style={{ marginLeft: Spacing.sm }}>
                {Math.floor(progress)}%
              </Text>
            </View>

            <View style={styles.bottomRow}>
              {/* Mini progress bar */}
              <View style={styles.miniBarContainer}>
                <View style={[styles.miniBarBg, { backgroundColor: `${color}20` }]}>
                  <View style={[styles.miniBarFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: color }]} />
                </View>
              </View>
              <Text variant="extraSmall" color={Colors.textSecondary}>
                {getDaysRemaining()}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  progressCircleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleIconOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  periodBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.small,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  miniBarContainer: {
    flex: 1,
  },
  miniBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
