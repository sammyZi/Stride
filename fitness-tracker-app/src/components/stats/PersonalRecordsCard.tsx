/**
 * PersonalRecordsCard Component
 * Displays personal records with trophy icons and badges
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { Text } from '../common/Text';
import { PersonalRecords, UnitSystem } from '../../types';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { formatDistance, formatPace, formatDuration } from '../../utils/formatting';

interface PersonalRecordsCardProps {
  records: PersonalRecords;
  units: UnitSystem;
  showBadges?: boolean;
}

interface RecordItemProps {
  icon: any;
  iconName: string;
  label: string;
  value: string;
  color: string;
  showBadge?: boolean;
  badgeColor?: string;
  onPress?: () => void;
}

const RecordItem: React.FC<RecordItemProps> = ({
  icon: Icon,
  iconName,
  label,
  value,
  color,
  showBadge = true,
  badgeColor = Colors.warning,
  onPress,
}) => (
  <TouchableOpacity style={styles.recordItem} onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
    <View style={[styles.recordIcon, { backgroundColor: `${color}15` }]}>
      <Icon name={iconName} size={20} color={color} />
      {showBadge && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Ionicons name="trophy" size={10} color={Colors.surface} />
        </View>
      )}
    </View>
    <View style={styles.recordContent}>
      <View style={styles.recordHeader}>
        <Text variant="small" color={Colors.textSecondary}>
          {label}
        </Text>
        {showBadge && (
          <View style={styles.recordBadge}>
            <Text variant="extraSmall" weight="semiBold" color={badgeColor}>
              RECORD
            </Text>
          </View>
        )}
      </View>
      <Text variant="medium" weight="semiBold" style={styles.recordValue}>
        {value}
      </Text>
    </View>
  </TouchableOpacity>
);

export const PersonalRecordsCard: React.FC<PersonalRecordsCardProps> = ({
  records,
  units,
  showBadges = true,
}) => {
  const navigation = useNavigation<any>();

  const handlePress = (activityId?: string) => {
    if (activityId) {
      navigation.navigate('ActivityDetail', { activityId });
    }
  };
  const hasRecords =
    records.longestDistance.value > 0 ||
    records.fastestPace.value > 0 ||
    records.longestDuration.value > 0 ||
    records.mostSteps.value > 0;

  if (!hasRecords) {
    return (
      <Card variant="outlined">
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="trophy" size={24} color={Colors.warning} />
          </View>
          <Text variant="mediumLarge" weight="semiBold" style={styles.title}>
            Personal Records
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="medal-outline" size={48} color={Colors.border} />
          </View>
          <Text variant="medium" color={Colors.textSecondary} align="center" style={styles.empty}>
            Complete activities to set your first records!
          </Text>
          <Text variant="small" color={Colors.textSecondary} align="center" style={styles.emptySubtext}>
            Track your longest distance, fastest pace, longest duration, and most steps
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <Ionicons name="trophy" size={24} color={Colors.warning} />
        </View>
        <View style={styles.headerContent}>
          <Text variant="mediumLarge" weight="semiBold" style={styles.title}>
            Personal Records
          </Text>
          <Text variant="small" color={Colors.textSecondary}>
            Your best achievements
          </Text>
        </View>
      </View>

      <View style={styles.recordsContainer}>
        {records.longestDistance.value > 0 && (
          <RecordItem
            icon={MaterialCommunityIcons}
            iconName="map-marker-distance"
            label="Longest Distance"
            value={formatDistance(records.longestDistance.value, units)}
            color={Colors.primary}
            showBadge={showBadges}
            badgeColor={Colors.primary}
            onPress={() => handlePress(records.longestDistance.activityId)}
          />
        )}

        {records.fastestPace.value > 0 && (
          <RecordItem
            icon={Ionicons}
            iconName="speedometer"
            label="Fastest Pace"
            value={formatPace(records.fastestPace.value, units)}
            color={Colors.success}
            showBadge={showBadges}
            badgeColor={Colors.success}
            onPress={() => handlePress(records.fastestPace.activityId)}
          />
        )}

        {records.longestDuration.value > 0 && (
          <RecordItem
            icon={Ionicons}
            iconName="time"
            label="Longest Duration"
            value={formatDuration(records.longestDuration.value)}
            color={Colors.info}
            showBadge={showBadges}
            badgeColor={Colors.info}
            onPress={() => handlePress(records.longestDuration.activityId)}
          />
        )}

        {records.mostSteps.value > 0 && (
          <RecordItem
            icon={MaterialCommunityIcons}
            iconName="walk"
            label="Most Steps"
            value={records.mostSteps.value.toLocaleString()}
            color={Colors.warning}
            showBadge={showBadges}
            badgeColor={Colors.warning}
            onPress={() => handlePress(records.mostSteps.activityId)}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
        <Text variant="small" color={Colors.textSecondary} style={styles.footerText}>
          Records are automatically updated when you complete activities
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.warning}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  title: {
    marginLeft: Spacing.md,
  },
  recordsContainer: {
    gap: Spacing.lg,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.medium,
  },
  recordIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  recordContent: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.small,
    backgroundColor: Colors.background,
  },
  recordValue: {
    marginTop: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    marginLeft: Spacing.xs,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  empty: {
    paddingVertical: Spacing.md,
  },
  emptySubtext: {
    paddingHorizontal: Spacing.lg,
    lineHeight: 20,
  },
});
