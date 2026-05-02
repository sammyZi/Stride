/**
 * Sync Toast Overlay (16.2)
 *
 * Renders toast notifications for sync events — errors, successes, and
 * informational messages — overlaid at the top of the screen. Each toast
 * supports an optional "Retry" action button and auto-dismisses.
 *
 * Must be placed near the root of the component tree so it renders
 * above all other content.
 *
 * Requirements: 9.1, 9.2, 9.3
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../common';
import { useSync } from '../../context/SyncContext';
import { useTheme } from '../../hooks';
import { Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { SyncNotification } from '../../context/SyncContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Single Toast Item ────────────────────────────────────────────────────────

const ToastItem: React.FC<{
  notification: SyncNotification;
  onDismiss: (id: string) => void;
  index: number;
}> = ({ notification, onDismiss, index }) => {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 18,
        stiffness: 200,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(notification.id);
    });
  };

  // ── Color / icon per type ──────────────────────────────────────────────

  const config = {
    error: {
      icon: 'alert-circle' as const,
      accentColor: colors.error,
      bgColor: colors.error + '12',
      borderColor: colors.error + '30',
    },
    success: {
      icon: 'checkmark-circle' as const,
      accentColor: '#00D9A3',
      bgColor: '#00D9A3' + '12',
      borderColor: '#00D9A3' + '30',
    },
    info: {
      icon: 'information-circle' as const,
      accentColor: colors.primary,
      bgColor: colors.primary + '12',
      borderColor: colors.primary + '30',
    },
  }[notification.type];

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.surface,
          borderColor: config.borderColor,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          marginTop: index > 0 ? Spacing.xs : 0,
        },
        Shadows.medium,
      ]}
    >
      {/* Accent bar */}
      <View style={[styles.accentBar, { backgroundColor: config.accentColor }]} />

      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={20} color={config.accentColor} />
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <Text variant="small" weight="semiBold" color={colors.textPrimary} numberOfLines={1}>
          {notification.title}
        </Text>
        <Text variant="extraSmall" color={colors.textSecondary} numberOfLines={2}>
          {notification.message}
        </Text>
      </View>

      {/* Retry button (optional) */}
      {notification.onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: config.accentColor + '18' }]}
          onPress={() => {
            notification.onRetry?.();
            handleDismiss();
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="refresh" size={14} color={config.accentColor} />
          <Text variant="extraSmall" weight="semiBold" color={config.accentColor}>
            Retry
          </Text>
        </TouchableOpacity>
      )}

      {/* Dismiss */}
      <TouchableOpacity
        onPress={handleDismiss}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={styles.dismissButton}
      >
        <Ionicons name="close" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Toast Overlay ────────────────────────────────────────────────────────────

export const SyncToastOverlay: React.FC = () => {
  const { notifications, dismissNotification } = useSync();
  const insets = useSafeAreaInsets();

  if (notifications.length === 0) return null;

  return (
    <View
      style={[styles.overlay, { top: insets.top + Spacing.sm }]}
      pointerEvents="box-none"
    >
      {notifications.map((notif, idx) => (
        <ToastItem
          key={notif.id}
          notification={notif}
          onDismiss={dismissNotification}
          index={idx}
        />
      ))}
    </View>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: BorderRadius.medium,
    borderBottomLeftRadius: BorderRadius.medium,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  contentContainer: {
    flex: 1,
    gap: 2,
    marginRight: Spacing.sm,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.small,
    gap: 4,
    marginRight: Spacing.sm,
  },
  dismissButton: {
    padding: 2,
  },
});
