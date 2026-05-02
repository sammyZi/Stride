/**
 * Sync Status Indicator (16.1)
 *
 * A compact, collapsible bar that shows:
 *  - Sync in-progress spinner
 *  - Last successful sync time
 *  - Queued operations count (with retry badge)
 *  - Network connectivity status
 *
 * Placed at the top of screens that care about sync state (e.g. Settings,
 * Activity History). Only visible when cloud-sync is enabled.
 *
 * Requirements: 5.1, 5.4
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../common';
import { useSync } from '../../context/SyncContext';
import { useTheme } from '../../hooks';
import { Spacing, BorderRadius } from '../../constants/theme';

// ── Component ────────────────────────────────────────────────────────────────

export const SyncStatusIndicator: React.FC = () => {
  const {
    isSyncing,
    lastSyncLabel,
    queuedCount,
    isOnline,
    isCloudSyncEnabled,
    triggerSync,
    retryFailed,
  } = useSync();

  const { colors } = useTheme();

  // ── Pulse animation for the syncing icon ────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isSyncing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isSyncing, pulseAnim]);

  // Don't render if cloud sync is disabled
  if (!isCloudSyncEnabled) return null;

  // ── Status icon ─────────────────────────────────────────────────────────

  const getStatusIcon = () => {
    if (isSyncing) {
      return (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={styles.statusIconContainer}
        />
      );
    }
    if (!isOnline) {
      return (
        <View style={[styles.statusIconContainer, { backgroundColor: colors.warning + '18' }]}>
          <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
        </View>
      );
    }
    if (queuedCount > 0) {
      return (
        <View style={[styles.statusIconContainer, { backgroundColor: colors.warning + '18' }]}>
          <Ionicons name="time-outline" size={18} color={colors.warning} />
        </View>
      );
    }
    return (
      <View style={[styles.statusIconContainer, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name="cloud-done-outline" size={18} color={colors.primary} />
      </View>
    );
  };

  // ── Status label ────────────────────────────────────────────────────────

  const getStatusLabel = (): string => {
    if (isSyncing) return 'Syncing…';
    if (!isOnline) return 'Offline';
    if (queuedCount > 0) return `${queuedCount} pending`;
    return 'Synced';
  };

  const getSubLabel = (): string | null => {
    if (isSyncing) return null;
    if (!isOnline) return 'Changes saved locally';
    if (lastSyncLabel) return lastSyncLabel;
    return null;
  };

  // ── Action button ─────────────────────────────────────────────────────

  const handleAction = () => {
    if (isSyncing) return;
    if (queuedCount > 0) {
      retryFailed();
    } else {
      triggerSync();
    }
  };

  const subLabel = getSubLabel();

  return (
    <Animated.View style={{ opacity: pulseAnim }}>
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={handleAction}
        disabled={isSyncing}
        activeOpacity={0.7}
        accessibilityLabel={`Sync status: ${getStatusLabel()}`}
        accessibilityHint={isSyncing ? 'Sync is in progress' : 'Tap to sync now'}
      >
        {getStatusIcon()}

        <View style={styles.textContainer}>
          <Text
            variant="small"
            weight="semiBold"
            color={
              !isOnline
                ? colors.warning
                : queuedCount > 0
                ? colors.warning
                : isSyncing
                ? colors.primary
                : colors.textSecondary
            }
          >
            {getStatusLabel()}
          </Text>
          {subLabel && (
            <Text variant="extraSmall" color={colors.textSecondary}>
              {subLabel}
            </Text>
          )}
        </View>

        {/* Queue badge */}
        {queuedCount > 0 && !isSyncing && (
          <View style={[styles.badge, { backgroundColor: colors.warning }]}>
            <Text variant="extraSmall" weight="bold" color="#fff">
              {queuedCount}
            </Text>
          </View>
        )}

        {/* Sync / Retry action chevron */}
        {!isSyncing && (
          <Ionicons
            name={queuedCount > 0 ? 'refresh' : 'sync-outline'}
            size={18}
            color={colors.textSecondary}
            style={styles.actionIcon}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
  },
  statusIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: Spacing.sm,
  },
  actionIcon: {
    marginLeft: Spacing.xs,
  },
});
