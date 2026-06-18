/**
 * PersonalRecordsCard Component
 * Displays personal records with trophy icons and badges
 * Flat editorial style — no card wrapper
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../common/Text';
import { PersonalRecords, UnitSystem } from '../../types';
import { Spacing, BorderRadius } from '../../constants/theme';
import { useTheme } from '../../hooks';
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
  colors: any;
}

const RecordItem: React.FC<RecordItemProps> = ({
  icon: Icon,
  iconName,
  label,
  value,
  color,
  showBadge = true,
  badgeColor,
  onPress,
  colors,
}) => (
  <TouchableOpacity style={[styles.recordItem, { borderBottomColor: colors.border }]} onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
    <View style={[styles.recordIcon, { backgroundColor: `${color}15` }]}>
      <Icon name={iconName} size={20} color={color} />
      {showBadge && (
        <View style={[styles.badge, { backgroundColor: badgeColor || colors.warning, borderColor: colors.surface }]}>
          <Ionicons name="trophy" size={10} color="#FFFFFF" />
        </View>
      )}
    </View>
    <View style={styles.recordContent}>
      <View style={styles.recordHeader}>
        <Text variant="small" color={colors.textSecondary}>
          {label}
        </Text>
        {showBadge && (
          <Text variant="extraSmall" weight="semiBold" color={badgeColor || colors.warning}>
            RECORD
          </Text>
        )}
      </View>
      <Text variant="medium" weight="semiBold" style={styles.recordValue}>
        {value}
      </Text>
    </View>
  </TouchableOpacity>
);

const PersonalRecordsCardComponent: React.FC<PersonalRecordsCardProps> = ({
  records,
  units,
  showBadges = true,
}) => {
  const { colors } = useTheme();
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
      <View>
        <View style={styles.header}>
          <View style={[styles.dot, { backgroundColor: colors.warning }]} />
          <Text variant="extraSmall" weight="semiBold" color={colors.warning} style={styles.sectionLabel}>
            PERSONAL RECORDS
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="medal-outline" size={36} color={colors.border} />
          <Text variant="small" color={colors.textSecondary} align="center" style={{ marginTop: Spacing.sm }}>
            Complete activities to set your first records!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: colors.warning }]} />
        <Text variant="extraSmall" weight="semiBold" color={colors.warning} style={styles.sectionLabel}>
          PERSONAL RECORDS
        </Text>
      </View>

      <View style={styles.recordsContainer}>
        {records.longestDistance.value > 0 && (
          <RecordItem
            icon={MaterialCommunityIcons}
            iconName="map-marker-distance"
            label="Longest Distance"
            value={formatDistance(records.longestDistance.value, units)}
            color={colors.primary}
            showBadge={showBadges}
            badgeColor={colors.primary}
            onPress={() => handlePress(records.longestDistance.activityId)}
            colors={colors}
          />
        )}

        {records.fastestPace.value > 0 && (
          <RecordItem
            icon={Ionicons}
            iconName="speedometer"
            label="Fastest Pace"
            value={formatPace(records.fastestPace.value, units)}
            color={colors.success}
            showBadge={showBadges}
            badgeColor={colors.success}
            onPress={() => handlePress(records.fastestPace.activityId)}
            colors={colors}
          />
        )}

        {records.longestDuration.value > 0 && (
          <RecordItem
            icon={Ionicons}
            iconName="time"
            label="Longest Duration"
            value={formatDuration(records.longestDuration.value)}
            color={colors.info}
            showBadge={showBadges}
            badgeColor={colors.info}
            onPress={() => handlePress(records.longestDuration.activityId)}
            colors={colors}
          />
        )}

        {records.mostSteps.value > 0 && (
          <RecordItem
            icon={MaterialCommunityIcons}
            iconName="walk"
            label="Most Steps"
            value={records.mostSteps.value.toLocaleString()}
            color={colors.warning}
            showBadge={showBadges}
            badgeColor={colors.warning}
            onPress={() => handlePress(records.mostSteps.activityId)}
            colors={colors}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
        <Text variant="extraSmall" color={colors.textSecondary} style={styles.footerText}>
          Records update automatically after activities
        </Text>
      </View>
    </View>
  );
};

// Memoized so the records list doesn't re-render on unrelated screen updates.
export const PersonalRecordsCard = React.memo(PersonalRecordsCardComponent);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  sectionLabel: {
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  recordsContainer: {
    gap: Spacing.sm,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recordIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
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
  recordValue: {
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
  },
  footerText: {
    marginLeft: 6,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
});
