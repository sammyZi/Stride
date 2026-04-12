/**
 * StatCard Component
 * Displays a single statistic with icon, label, and value
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { Text } from '../common/Text';
import { Colors, Spacing } from '../../constants/theme';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  color = Colors.primary,
}) => {
  return (
    <Card variant="outlined" style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text variant="small" color={Colors.textSecondary} style={styles.label}>
        {label}
      </Text>
      <Text variant="large" weight="semiBold" style={styles.value}>
        {value}
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '48%',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.xs,
  },
  value: {
    marginTop: Spacing.xs,
  },
});
