/**
 * Account Settings Screen
 *
 * Displays the user's account information, cloud-sync toggle,
 * sync status / last sync time, and logout functionality.
 *
 * When cloud-sync is enabled for the first time the screen shows a
 * migration progress dialog that uploads all local data to Supabase.
 *
 * Requirements: 3.1, 4.3, 4.5, 8.1, 8.2, 8.3
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Text, Button } from '../../components/common';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuth } from '../../context';
import { useTheme } from '../../hooks';
import StorageService from '../../services/storage/StorageService';
import SyncService from '../../services/sync/SyncService';
import type { MigrationProgress } from '../../services/sync';

// ── Constants ────────────────────────────────────────────────────────────────

const LAST_SYNC_KEY = '@last_sync_time';
const MIGRATION_DONE_KEY = '@cloud_migration_done';

// ── Component ────────────────────────────────────────────────────────────────

export const AccountSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, isAuthenticated, signOut, signInWithGoogle } = useAuth();
  const { colors } = useTheme();

  // State
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isTogglingSync, setIsTogglingSync] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Migration dialog state (15.3)
  const [showMigration, setShowMigration] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null);
  const [migrationDone, setMigrationDone] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const migrationRunning = useRef(false);

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

    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // ── Migration logic (15.3) ────────────────────────────────────────────

  const runMigration = useCallback(async () => {
    if (migrationRunning.current || !user) return;
    migrationRunning.current = true;
    setMigrationDone(false);
    setMigrationError(null);
    setMigrationProgress({ phase: 'Preparing…', completedItems: 0, totalItems: 0, percent: 0 });

    try {
      // Initialize the sync service for this user
      await SyncService.initialize(user.id);

      const result = await SyncService.migrateLocalDataToCloud((progress) => {
        setMigrationProgress(progress);
      });

      if (result.success) {
        await AsyncStorage.setItem(MIGRATION_DONE_KEY, 'true');
        await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
        setLastSyncTime('Just now');
        setMigrationDone(true);
      } else {
        setMigrationError(
          result.errors.length > 0
            ? `Migration completed with ${result.errors.length} error(s). Your local data is preserved.`
            : 'Migration failed. Your local data is preserved. You can try again later.'
        );
        // Still mark partial success — cloud-sync stays enabled
        setMigrationDone(true);
      }
    } catch {
      setMigrationError('An unexpected error occurred. Your local data is preserved.');
      setMigrationDone(true);
    } finally {
      migrationRunning.current = false;
    }
  }, [user]);

  // ── Toggle cloud sync ──────────────────────────────────────────────────

  const handleToggleCloudSync = useCallback(async (value: boolean) => {
    if (!isAuthenticated || !user) {
      Alert.alert('Account Required', 'Please sign in to enable cloud sync.');
      return;
    }

    setIsTogglingSync(true);
    try {
      if (value) {
        // Enable cloud sync
        await StorageService.enableCloudSync(user.id);
        setCloudSyncEnabled(true);

        // Check if migration has already been done
        const alreadyMigrated = await AsyncStorage.getItem(MIGRATION_DONE_KEY);
        if (alreadyMigrated !== 'true') {
          // First time — show migration dialog (15.3)
          setShowMigration(true);
          // Migration starts after dialog is shown
          setTimeout(() => runMigration(), 300);
        } else {
          // Already migrated — just initialize sync
          await SyncService.initialize(user.id);
        }
      } else {
        // Disable cloud sync — ask for confirmation
        Alert.alert(
          'Disable Cloud Sync',
          'Your local data will be preserved, but changes will no longer sync to the cloud.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setIsTogglingSync(false) },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                await SyncService.shutdown();
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
  }, [isAuthenticated, user, runMigration]);

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
              await SyncService.shutdown();
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

  // ── Render: Not authenticated ──────────────────────────────────────────

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

          <View style={{ marginTop: Spacing.xl, width: '100%', paddingHorizontal: Spacing.xl }}>
            <Button
              title="Log In / Sign Up"
              variant="primary"
              size="large"
              fullWidth
              onPress={async () => {
                // Remove the local-only flag from storage
                await AsyncStorage.removeItem('@auth_skipped');
                
                // Tell AppNavigator to drop the tabs and show the true Auth stack
                require('react-native').DeviceEventEmitter.emit('RESET_AUTH_SKIPPED');
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render: Authenticated ──────────────────────────────────────────────

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
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
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
        </View>

        {/* Cloud Sync Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
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
        </View>

        {/* Account Actions */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
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
        </View>

        {/* Info footer */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Your local data is always preserved, even if you disable cloud sync or log out.
            Enabling cloud sync allows you to access your data across multiple devices.
          </Text>
        </View>
      </ScrollView>

      {/* ── Migration Progress Dialog (15.3) ─────────────────────────────── */}
      <Modal
        visible={showMigration}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (migrationDone) setShowMigration(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.migrationDialog, { backgroundColor: colors.surface }]}>
            {/* Icon */}
            <View style={[styles.migrationIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons
                name={migrationDone ? (migrationError ? 'alert-circle' : 'checkmark-circle') : 'cloud-upload-outline'}
                size={40}
                color={migrationDone && migrationError ? Colors.warning : colors.primary}
              />
            </View>

            {/* Title */}
            <Text variant="large" weight="bold" color={colors.textPrimary} style={styles.migrationTitle}>
              {migrationDone
                ? migrationError
                  ? 'Migration Complete'
                  : 'All Done!'
                : 'Migrating Data'}
            </Text>

            {/* Progress info */}
            {!migrationDone && migrationProgress && (
              <>
                <Text variant="regular" color={colors.textSecondary} style={styles.migrationPhase}>
                  {migrationProgress.phase}
                </Text>

                {/* Progress bar */}
                <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${migrationProgress.percent}%`,
                      },
                    ]}
                  />
                </View>

                <Text variant="small" color={colors.textSecondary}>
                  {migrationProgress.completedItems} / {migrationProgress.totalItems} items
                </Text>
              </>
            )}

            {/* Completion message */}
            {migrationDone && (
              <>
                {migrationError ? (
                  <Text variant="regular" color={Colors.warning} style={styles.migrationPhase}>
                    {migrationError}
                  </Text>
                ) : (
                  <Text variant="regular" color={colors.textSecondary} style={styles.migrationPhase}>
                    Your data has been successfully uploaded to the cloud.
                  </Text>
                )}

                <Button
                  title="Done"
                  variant="primary"
                  size="medium"
                  fullWidth
                  onPress={() => setShowMigration(false)}
                  style={styles.migrationButton}
                />

                {migrationError && (
                  <Button
                    title="Retry Migration"
                    variant="outline"
                    size="medium"
                    fullWidth
                    onPress={() => {
                      setMigrationDone(false);
                      setMigrationError(null);
                      setTimeout(() => runMigration(), 300);
                    }}
                    style={styles.migrationRetryButton}
                  />
                )}
              </>
            )}

            {/* Loading spinner when migration is running */}
            {!migrationDone && (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.migrationSpinner}
              />
            )}
          </View>
        </View>
      </Modal>
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

  // ── Migration dialog ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  migrationDialog: {
    width: '100%',
    borderRadius: BorderRadius.extraLarge,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.large,
  },
  migrationIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  migrationTitle: {
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  migrationPhase: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  migrationButton: {
    marginTop: Spacing.md,
  },
  migrationRetryButton: {
    marginTop: Spacing.sm,
  },
  migrationSpinner: {
    marginTop: Spacing.md,
  },
});
