/**
 * Account Settings Screen
 *
 * Displays the user's account information, cloud-sync toggle,
 * sync status / last sync time, and logout functionality.
 *
 * Requirements: 3.1, 4.3, 4.5
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '../../components/common';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuth } from '../../context';
import { useTheme } from '../../hooks';
import StorageService from '../../services/storage/StorageService';

// ── Constants ────────────────────────────────────────────────────────────────

const LAST_SYNC_KEY = '@last_sync_time';

// ── Component ────────────────────────────────────────────────────────────────

export const AccountSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, isAuthenticated, signOut } = useAuth();
  const { colors } = useTheme();

  // State
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isTogglingSync, setIsTogglingSync] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ── Load initial state ─────────────────────────────────────────────────

  useEffect(() => {
    const mode = StorageService.getStorageMode();
    setCloudSyncEnabled(mode === 'cloud-sync');

    AsyncStorage.getItem(LAST_SYNC_KEY).then((v) => {
      if (v) {
        setLastSyncTime(formatSyncTime(parseInt(v, 10)));
      }
    });
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────

  function formatSyncTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;

    // Same year — omit the year
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // ── Toggle cloud sync ──────────────────────────────────────────────────

  const handleToggleCloudSync = useCallback(async (value: boolean) => {
    if (!isAuthenticated || !user) {
      Alert.alert(
        'Account Required',
        'Please sign in to enable cloud sync.',
      );
      return;
    }

    setIsTogglingSync(true);
    try {
      if (value) {
        await StorageService.enableCloudSync(user.id);
        setCloudSyncEnabled(true);
      } else {
        Alert.alert(
          'Disable Cloud Sync',
          'Your local data will be preserved, but changes will no longer sync to the cloud.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setIsTogglingSync(false) },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                await StorageService.disableCloudSync();
                setCloudSyncEnabled(false);
                setIsTogglingSync(false);
              },
            },
          ],
        );
        return;
      }
    } catch {
      Alert.alert('Error', 'Failed to update sync settings. Please try again.');
    } finally {
      setIsTogglingSync(false);
    }
  }, [isAuthenticated, user]);

  // ── Logout ─────────────────────────────────────────────────────────────

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out? Your local data will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await signOut();
            } catch {
              Alert.alert('Error', 'Failed to log out. Please try again.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ],
    );
  }, [signOut]);

  // ── Render ─────────────────────────────────────────────────────────────

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="large" weight="bold" color={colors.textPrimary}>Account</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="person-outline" size={48} color={colors.primary} />
          </View>
          <Text variant="large" weight="semiBold" color={colors.textPrimary} style={styles.emptyTitle}>
            Not Signed In
          </Text>
          <Text variant="regular" color={colors.textSecondary} style={styles.emptySubtitle}>
            Sign in to sync your data across devices and keep it safe in the cloud.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="large" weight="bold" color={colors.textPrimary}>Account</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Account Info Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="person" size={32} color={colors.primary} />
          </View>
          <View style={styles.accountInfo}>
            <Text variant="regular" weight="semiBold" color={colors.textPrimary}>
              {user.email}
            </Text>
            <Text variant="small" color={colors.textSecondary}>
              Member since {new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
            </Text>
          </View>
        </Animated.View>

        {/* Cloud Sync Section */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Cloud Sync</Text>

          {/* Sync toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="cloud-outline" size={24} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Enable Cloud Sync</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Automatically back up your data to the cloud
                </Text>
              </View>
            </View>
            {isTogglingSync ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                value={cloudSyncEnabled}
                onValueChange={handleToggleCloudSync}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            )}
          </View>

          {/* Storage mode indicator */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons
                name={cloudSyncEnabled ? 'cloud-done-outline' : 'phone-portrait-outline'}
                size={24}
                color={cloudSyncEnabled ? Colors.success : colors.textSecondary}
              />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Storage Mode</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  {cloudSyncEnabled ? 'Cloud Sync — data backed up online' : 'Local Only — data on this device'}
                </Text>
              </View>
            </View>
            <View style={[styles.badge, {
              backgroundColor: cloudSyncEnabled ? Colors.success + '18' : colors.border + '40',
            }]}>
              <Text variant="extraSmall" weight="semiBold" color={cloudSyncEnabled ? Colors.success : colors.textSecondary}>
                {cloudSyncEnabled ? 'ACTIVE' : 'OFF'}
              </Text>
            </View>
          </View>

          {/* Last sync time */}
          {cloudSyncEnabled && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="time-outline" size={24} color={colors.textSecondary} />
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Last Synced</Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    {lastSyncTime ?? 'Not yet synced'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Account Actions */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleLogout}
            disabled={isLoggingOut}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="log-out-outline" size={24} color={Colors.error} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: Colors.error }]}>Log Out</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Sign out of your account
                </Text>
              </View>
            </View>
            {isLoggingOut ? (
              <ActivityIndicator size="small" color={Colors.error} />
            ) : (
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Info footer */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Your local data is always preserved, even if you disable cloud sync or log out. 
            Enabling cloud sync allows you to access your data across multiple devices.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  scrollView: {
    flex: 1,
  },

  // ── Account card ──
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.large,
    padding: Spacing.xl,
    ...Shadows.small,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  accountInfo: {
    flex: 1,
    gap: 4,
  },

  // ── Section ──
  section: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },

  // ── Badge ──
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  // ── Info footer ──
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.lg,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
  },

  // ── Empty state ──
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
