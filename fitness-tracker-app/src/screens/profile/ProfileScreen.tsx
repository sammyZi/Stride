/**
 * Profile Screen
 * 
 * Displays and allows editing of user profile information:
 * - Name, weight, height
 * - Profile picture
 * - Quick stats summary
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';

/** Generate a UUID v4 string. */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Text, ConfirmModal } from '../../components/common';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/stats/StatCard';
import { PersonalRecordsCard } from '../../components/stats/PersonalRecordsCard';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import { useTheme } from '../../hooks';
import { useStatistics } from '../../hooks/useStatistics';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import StorageService from '../../services/storage/StorageService';
import SyncService from '../../services/sync/SyncService';
import { UserProfile, UserSettings, StatsPeriod, Activity } from '../../types';
import { ProgressChartCard } from '../../components/stats/ProgressChartCard';
import { formatDistanceValue, formatDuration, formatDistance, formatPace, formatCalories } from '../../utils/formatting';

type TabType = 'week' | 'month' | 'allTime';

const TABS: { key: TabType; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'allTime', label: 'All Time' },
];

export const ProfileScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('week');
  const { modalState, showConfirm, hideModal } = useConfirmModal();
  const { colors } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Use statistics hook for detailed stats
  const { stats, loading: statsLoading, refresh: refreshStats } = useStatistics(activeTab as StatsPeriod);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);

  // Reload profile every time the screen is focused
  // (ensures cloud-synced data appears after download)
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const syncResult = await SyncService.forceManualSync();
      if (!syncResult.success) {
        // Show an error if sync failed
        console.warn('Sync partially failed:', syncResult.errors);
      }
    } catch (e) {
      console.error('Manual sync error', e);
    }
    // Reload local state with the newly downloaded/merged data
    await Promise.all([loadProfile(), refreshStats()]);
    setRefreshing(false);
  };

  const loadProfile = async () => {
    try {
      const savedProfile = await StorageService.getUserProfile();
      const savedSettings = await StorageService.getSettings();
      const fetchedActivities = await StorageService.getActivities({});
      
      setAllActivities(fetchedActivities);
      if (savedProfile) {
        setProfile(savedProfile);
        setEditName(savedProfile.name);
        setEditWeight(savedProfile.weight?.toString() || '');
        setEditHeight(savedProfile.height?.toString() || '');
      } else {
        // Create default profile — suppress sync so this placeholder
        // doesn't overwrite the real profile in Supabase.
        // downloadAllData() will replace it with the cloud version.
        const defaultProfile: UserProfile = {
          id: generateUUID(),
          name: 'Fitness Enthusiast',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        StorageService.suppressSync();
        await StorageService.saveUserProfile(defaultProfile);
        StorageService.resumeSync();
        setProfile(defaultProfile);
        setEditName(defaultProfile.name);
      }
      
      setSettings(savedSettings);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarPress = () => {
    if (profile?.profilePictureUri) {
      setImageViewerVisible(true);
    } else {
      handlePickImage();
    }
  };

  const handleRemoveImage = async () => {
    try {
      const updatedProfile: UserProfile = {
        ...profile!,
        profilePictureUri: undefined,
        updatedAt: Date.now(),
      };
      await StorageService.saveUserProfile(updatedProfile);
      setProfile(updatedProfile);
    } catch (error) {
      console.error('Error removing image:', error);
      showConfirm(
        'Error',
        'Failed to remove profile picture',
        [{ text: 'OK', onPress: hideModal, style: 'default' }],
        { icon: 'alert-circle', iconColor: Colors.error }
      );
    }
  };



  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        showConfirm(
          'Permission Required',
          'Please grant camera roll permissions to change your profile picture.',
          [{ text: 'OK', onPress: hideModal, style: 'default' }],
          { icon: 'camera', iconColor: Colors.primary }
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, 
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Preview the photo first instead of instantly saving
        setPendingImageUri(result.assets[0].uri);
        setImageViewerVisible(true);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showConfirm(
        'Error',
        'Failed to pick profile picture',
        [{ text: 'OK', onPress: hideModal, style: 'default' }],
        { icon: 'alert-circle', iconColor: Colors.error }
      );
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (!editName.trim()) {
        showConfirm(
          'Error',
          'Name cannot be empty',
          [{ text: 'OK', onPress: hideModal, style: 'default' }],
          { icon: 'alert-circle', iconColor: Colors.error }
        );
        return;
      }

      const weight = editWeight ? parseFloat(editWeight) : undefined;
      const height = editHeight ? parseFloat(editHeight) : undefined;

      if (weight && (weight <= 0 || weight > 500)) {
        showConfirm(
          'Error',
          'Please enter a valid weight (1-500 kg)',
          [{ text: 'OK', onPress: hideModal, style: 'default' }],
          { icon: 'alert-circle', iconColor: Colors.error }
        );
        return;
      }

      if (height && (height <= 0 || height > 300)) {
        showConfirm(
          'Error',
          'Please enter a valid height (1-300 cm)',
          [{ text: 'OK', onPress: hideModal, style: 'default' }],
          { icon: 'alert-circle', iconColor: Colors.error }
        );
        return;
      }

      const updatedProfile: UserProfile = {
        ...profile!,
        name: editName.trim(),
        weight,
        height,
        updatedAt: Date.now(),
      };

      await StorageService.saveUserProfile(updatedProfile);
      setProfile(updatedProfile);
      setEditModalVisible(false);
      showConfirm(
        'Success',
        'Profile updated successfully',
        [{ text: 'OK', onPress: hideModal, style: 'default' }],
        { icon: 'checkmark-circle', iconColor: Colors.success }
      );
    } catch (error) {
      console.error('Error saving profile:', error);
      showConfirm(
        'Error',
        'Failed to save profile',
        [{ text: 'OK', onPress: hideModal, style: 'default' }],
        { icon: 'alert-circle', iconColor: Colors.error }
      );
    }
  };

  const openEditModal = () => {
    setEditName(profile?.name || '');
    setEditWeight(profile?.weight?.toString() || '');
    setEditHeight(profile?.height?.toString() || '');
    setEditModalVisible(true);
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Text
            variant="medium"
            weight={activeTab === tab.key ? 'semiBold' : 'regular'}
            color={activeTab === tab.key ? Colors.primary : Colors.textSecondary}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStatsCards = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsCardsGrid}>
        <StatCard
          icon="map"
          label="Distance"
          value={formatDistance(stats.totalDistance, settings?.units || 'metric')}
          color={Colors.primary}
        />
        <StatCard
          icon="time"
          label="Time"
          value={formatDuration(stats.totalDuration)}
          color={Colors.success}
        />
        <StatCard
          icon="fitness"
          label="Activities"
          value={stats.totalActivities.toString()}
          color={Colors.info}
        />
        <StatCard
          icon="speedometer"
          label="Avg Pace"
          value={
            stats.averagePace > 0
              ? formatPace(stats.averagePace, settings?.units || 'metric')
              : '--:--'
          }
          color={Colors.warning}
        />
        <StatCard
          icon="walk"
          label="Steps"
          value={stats.totalSteps.toLocaleString()}
          color={Colors.primary}
        />
        <StatCard
          icon="flame"
          label="Calories"
          value={formatCalories(stats.totalCalories)}
          color={Colors.error}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ── Header ────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text variant="large" weight="bold" color={colors.textPrimary}>
          Profile & Stats
        </Text>
        <TouchableOpacity 
          onPress={handleRefresh} 
          disabled={refreshing}
          style={[styles.syncButton, { backgroundColor: colors.surface }]}
          activeOpacity={0.7}
        >
          <Ionicons name="sync-circle-outline" size={24} color={refreshing ? colors.disabled : colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Profile Hero ──────────────────────────────────────── */}
        <View style={[styles.profileHero, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarContainer}>
            {profile?.profilePictureUri ? (
              <Image
                source={{ uri: profile.profilePictureUri }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="person" size={44} color={colors.primary} />
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
              <Ionicons name="camera" size={13} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text variant="large" weight="bold" color={colors.textPrimary} style={{ marginTop: 14 }}>
            {profile?.name}
          </Text>

          {(profile?.weight || profile?.height) && (
            <Text variant="small" color={colors.textSecondary} style={{ marginTop: 2 }}>
              {profile?.weight ? `${profile.weight} kg` : ''}
              {profile?.weight && profile?.height ? '  •  ' : ''}
              {profile?.height ? `${profile.height} cm` : ''}
            </Text>
          )}

          <TouchableOpacity
            onPress={openEditModal}
            style={[styles.editProfileBtn, { borderColor: colors.primary + '40' }]}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text variant="small" weight="semiBold" color={colors.primary}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* ── Statistics Section ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>Statistics</Text>

          {renderTabBar()}

          {statsLoading && !stats ? (
            <View style={styles.statsLoading}>
              <Text variant="small" color={colors.textSecondary}>Loading stats...</Text>
            </View>
          ) : stats && stats.totalActivities > 0 ? (
            <>
              {renderStatsCards()}

              {/* Personal Records */}
              {stats.personalRecords && (
                <View style={styles.recordsContainer}>
                  <PersonalRecordsCard records={stats.personalRecords} units={settings?.units || 'metric'} />
                </View>
              )}
            </>
          ) : (
            <View style={[styles.emptyStats, { backgroundColor: colors.surface }]}>
              <View style={[styles.emptyStatsIcon, { backgroundColor: colors.primary + '12' }]}>
                <Ionicons name="stats-chart-outline" size={36} color={colors.primary} />
              </View>
              <Text variant="medium" weight="medium" color={colors.textSecondary} align="center">
                No activities yet
              </Text>
              <Text variant="small" color={colors.textSecondary} align="center">
                Start tracking to see your stats!
              </Text>
            </View>
          )}
        </View>

        {/* Progress Charts */}
        {allActivities.length > 0 && (
          <ProgressChartCard activities={allActivities} units={settings?.units || 'metric'} />
        )}

        {/* ── Profile Details ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>Details</Text>

          <View style={[styles.detailsCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.detailIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="person-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text variant="extraSmall" color={colors.textSecondary}>Name</Text>
                <Text variant="medium" weight="medium" color={colors.textPrimary}>
                  {profile?.name}
                </Text>
              </View>
            </View>

            {profile?.weight && (
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.detailIcon, { backgroundColor: Colors.success + '15' }]}>
                  <Ionicons name="scale-outline" size={18} color={Colors.success} />
                </View>
                <View style={styles.detailContent}>
                  <Text variant="extraSmall" color={colors.textSecondary}>Weight</Text>
                  <Text variant="medium" weight="medium" color={colors.textPrimary}>
                    {profile.weight} kg
                  </Text>
                </View>
              </View>
            )}

            {profile?.height && (
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: Colors.info + '15' }]}>
                  <Ionicons name="resize-outline" size={18} color={Colors.info} />
                </View>
                <View style={styles.detailContent}>
                  <Text variant="extraSmall" color={colors.textSecondary}>Height</Text>
                  <Text variant="medium" weight="medium" color={colors.textPrimary}>
                    {profile.height} cm
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="medium" weight="bold" color={Colors.textPrimary}>
                Edit Profile
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text variant="small" weight="medium" color={Colors.textSecondary}>
                  Name *
                </Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                  placeholderTextColor={Colors.disabled}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text variant="small" weight="medium" color={Colors.textSecondary}>
                  Weight (kg)
                </Text>
                <TextInput
                  style={styles.input}
                  value={editWeight}
                  onChangeText={setEditWeight}
                  placeholder="Enter your weight"
                  placeholderTextColor={Colors.disabled}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text variant="small" weight="medium" color={Colors.textSecondary}>
                  Height (cm)
                </Text>
                <TextInput
                  style={styles.input}
                  value={editHeight}
                  onChangeText={setEditHeight}
                  placeholder="Enter your height"
                  placeholderTextColor={Colors.disabled}
                  keyboardType="decimal-pad"
                />
              </View>

              <Text variant="extraSmall" color={Colors.textSecondary} style={styles.helpText}>
                Weight and height are used for calorie calculations
              </Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setEditModalVisible(false)}
                style={styles.modalButton}
              />
              <Button
                title="Save"
                variant="primary"
                onPress={handleSaveProfile}
                style={styles.modalButton}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={modalState.visible}
        title={modalState.title}
        message={modalState.message}
        icon={modalState.icon as any}
        iconColor={modalState.iconColor}
        buttons={modalState.buttons}
        loading={modalState.loading}
        loadingMessage={modalState.loadingMessage}
        onRequestClose={hideModal}
      />

      {/* Full Screen Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setImageViewerVisible(false);
          setPendingImageUri(null);
        }}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity 
            style={styles.imageViewerClose} 
            onPress={() => {
              setImageViewerVisible(false);
              setPendingImageUri(null);
            }}
          >
            <Ionicons name="close" size={32} color="#ffffff" />
          </TouchableOpacity>

          {(pendingImageUri || profile?.profilePictureUri) && (
            <>
              <Image
                source={{ uri: (pendingImageUri || profile?.profilePictureUri) as string }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
              <View style={styles.imageViewerActions}>
                {pendingImageUri ? (
                  // Preview Mode Actions
                  <>
                    <TouchableOpacity 
                      style={[styles.imageViewerButton, styles.imageViewerButtonDelete]} 
                      onPress={() => {
                        setImageViewerVisible(false);
                        setPendingImageUri(null);
                      }}
                    >
                      <Ionicons name="close-outline" size={20} color={Colors.error} />
                      <Text style={styles.imageViewerButtonTextDelete}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.imageViewerButton, { backgroundColor: Colors.success }]} 
                      onPress={async () => {
                        try {
                          const updatedProfile: UserProfile = {
                            ...profile!,
                            profilePictureUri: pendingImageUri,
                            updatedAt: Date.now(),
                          };
                          await StorageService.saveUserProfile(updatedProfile);
                          setProfile(updatedProfile);
                          setImageViewerVisible(false);
                          setPendingImageUri(null);
                        } catch (error) {
                          console.error('Error saving new image:', error);
                        }
                      }}
                    >
                      <Ionicons name="checkmark" size={20} color="#ffffff" />
                      <Text style={styles.imageViewerButtonTextUpdate}>Confirm</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  // Normal View Mode Actions
                  <>
                    <TouchableOpacity 
                      style={[styles.imageViewerButton, styles.imageViewerButtonDelete]} 
                      onPress={() => {
                        setImageViewerVisible(false);
                        setTimeout(handleRemoveImage, 350);
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color={Colors.error} />
                      <Text style={styles.imageViewerButtonTextDelete}>Delete</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.imageViewerButton, styles.imageViewerButtonUpdate]} 
                      onPress={() => {
                        setImageViewerVisible(false);
                        setTimeout(handlePickImage, 350);
                      }}
                    >
                      <Ionicons name="camera-outline" size={20} color="#ffffff" />
                      <Text style={styles.imageViewerButtonTextUpdate}>Update</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  syncButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  // ── Profile Hero ──────────────────────────────────────────────────────
  profileHero: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1.5,
  },

  // ── Sections ──────────────────────────────────────────────────────────
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },

  // ── Stats ─────────────────────────────────────────────────────────────
  statsCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  statsLoading: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyStats: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
  },
  emptyStatsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  recordsContainer: {
    marginTop: Spacing.lg,
  },

  // ── Tab bar ───────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeTab: {
    backgroundColor: `${Colors.primary}15`,
    borderColor: Colors.primary,
  },

  // ── Details card ──────────────────────────────────────────────────────
  detailsCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  detailContent: {
    flex: 1,
  },

  // ── Modals ────────────────────────────────────────────────────────────
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.extraLarge,
    borderTopRightRadius: BorderRadius.extraLarge,
    maxHeight: '80%',
    ...Shadows.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalForm: {
    padding: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  helpText: {
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    padding: Spacing.xl,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalButton: {
    flex: 1,
  },

  // ── Image viewer ──────────────────────────────────────────────────────
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  fullScreenImage: {
    width: '100%',
    height: '75%',
  },
  imageViewerActions: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    flexDirection: 'row',
    gap: Spacing.lg,
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  imageViewerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.large,
    gap: Spacing.sm,
  },
  imageViewerButtonDelete: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
  imageViewerButtonUpdate: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  imageViewerButtonTextDelete: {
    color: Colors.error,
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },
  imageViewerButtonTextUpdate: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },
});
