import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../common/Text';
import { Colors, BorderRadius, Spacing, Shadows } from '../../constants/theme';

/**
 * ActivityTypeSelector
 * 
 * Note: Currently the app uses a single 'activity' type.
 * This component is kept for future multi-activity support.
 * It displays the current activity type as a label.
 */
export const ActivityTypeSelector: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={[styles.option, styles.optionSelected]}>
        <Ionicons
          name="fitness"
          size={24}
          color={Colors.surface}
        />
        <Text
          variant="small"
          weight="semiBold"
          color={Colors.surface}
          style={styles.label}
        >
          Activity
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    padding: Spacing.xs,
    ...Shadows.medium,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.medium,
  },
  optionSelected: {
    backgroundColor: Colors.primary,
  },
  label: {
    marginLeft: Spacing.sm,
  },
});
