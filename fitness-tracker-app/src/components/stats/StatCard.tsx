/**
 * StatCard Component
 * Displays a single statistic with icon, label, and value
 * Flat editorial style — no card wrapper
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../common/Text';
import { Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color?: string;
}

const StatCardComponent: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  color,
}) => {
  const { colors } = useTheme();
  const iconColor = color || colors.primary;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text variant="extraSmall" weight="medium" color={colors.textSecondary}>
          {label}
        </Text>
      </View>
      <Text variant="mediumLarge" weight="bold" color={colors.textPrimary}>
        {value}
      </Text>
    </View>
  );
};

// Memoized to avoid re-rendering all stat cards on unrelated screen updates.
export const StatCard = React.memo(StatCardComponent);

const styles = StyleSheet.create({
  card: {
    width: '48%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
