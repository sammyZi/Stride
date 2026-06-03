/**
 * Profile Screen
 * 
 * Displays and allows editing of user profile information:
 * - Name, weight, height
 * - Profile picture
 * - Quick stats summary
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Animated,
  Dimensions,
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
import { StatCard } from '../../components/stats/StatCard';
import { PersonalRecordsCard } from '../../components/stats/PersonalRecordsCard';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import { useTheme } from '../../hooks';
import { useStatistics } from '../../hooks/useStatistics';
import { LightColors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import StorageService from '../../services/storage/StorageService';
import SyncService from '../../services/sync/SyncService';
import { UserProfile, UserSettings, StatsPeriod, Activity } from '../../types';
import { ProgressChartCard } from '../../components/stats/ProgressChartCard';
import { formatDistanceValue, formatDuration, formatDistance, formatPace, formatCalories } from '../../utils/formatting';

type TabType = 'week' | 'month' | 'allTime';

const getWeekDateRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  const startMonth = start.toLocaleDateString(undefined, { month: 'short' });
  const endMonth = end.toLocaleDateString(undefined, { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
};

const getMonthDateRange = () => {
  const now = new Date();
  return now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

export const ProfileScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('week');
  const { modalState, showConfirm, hideModal } = useConfirmModal();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Edit modal animation refs
  const editOverlayAnim = useRef(new Animated.Value(0)).current;
  const editSlideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  const openEditModal = useCallback(() => {
    setEditName(profile?.name || '');
    setEditWeight(profile?.weight?.toString() || '');
    setEditHeight(profile?.height?.toString() || '');
    setEditModalVisible(true);
    Animated.parallel([
      Animated.timing(editOverlayAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(editSlideAnim, {
        toValue: 0,
        damping: 28,
        stiffness: 120,
        mass: 0.95,
        useNativeDriver: true,
        restSpeedThreshold: 100,
        restDisplacementThreshold: 40,
      }),
    ]).start();
  }, [profile]);

  const closeEditModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(editOverlayAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.spring(editSlideAnim, {
        toValue: Dimensions.get('window').height,
        damping: 28,
        stiffness: 120,
        mass: 0.95,
        useNativeDriver: true,
        restSpeedThreshold: 100,
        restDisplacementThreshold: 40,
      }),
    ]).start(() => {
      setEditModalVisible(false);
    });
  }, []);

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
        { icon: 'alert-circle', iconColor: colors.error }
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
          { icon: 'camera', iconColor: colors.primary }
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
        { icon: 'alert-circle', iconColor: colors.error }
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
          { icon: 'alert-circle', iconColor: colors.error }
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
          { icon: 'alert-circle', iconColor: colors.error }
        );
        return;
      }

      if (height && (height <= 0 || height > 300)) {
        showConfirm(
          'Error',
          'Please enter a valid height (1-300 cm)',
          [{ text: 'OK', onPress: hideModal, style: 'default' }],
          { icon: 'alert-circle', iconColor: colors.error }
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
      closeEditModal();
      showConfirm(
        'Success',
        'Profile updated successfully',
        [{ text: 'OK', onPress: hideModal, style: 'default' }],
        { icon: 'checkmark-circle', iconColor: colors.success }
      );
    } catch (error) {
      console.error('Error saving profile:', error);
      showConfirm(
        'Error',
        'Failed to save profile',
        [{ text: 'OK', onPress: hideModal, style: 'default' }],
        { icon: 'alert-circle', iconColor: colors.error }
      );
    }
  };

  // openEditModal is now defined above with animation

  const tabs: { key: TabType; label: string }[] = [
    { key: 'week', label: getWeekDateRange() },
    { key: 'month', label: getMonthDateRange() },
    { key: 'allTime', label: 'All Time' },
  ];

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => setActiveTab(tab.key)}
          activeOpacity={0.7}
        >
          <Text
            variant="small"
            weight={activeTab === tab.key ? 'bold' : 'regular'}
            color={activeTab === tab.key ? colors.primary : colors.textSecondary}
          >
            {tab.label}
          </Text>
          {activeTab === tab.key && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
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
          color={colors.primary}
        />
        <StatCard
          icon="time"
          label="Time"
          value={formatDuration(stats.totalDuration)}
          color={colors.success}
        />
        <StatCard
          icon="fitness"
          label="Activities"
          value={stats.totalActivities.toString()}
          color={colors.info}
        />
        <StatCard
          icon="speedometer"
          label="Avg Pace"
          value={
            stats.averagePace > 0
              ? formatPace(stats.averagePace, settings?.units || 'metric')
              : '--:--'
          }
          color={colors.warning}
        />
        <StatCard
          icon="walk"
          label="Steps"
          value={stats.totalSteps.toLocaleString()}
          color={colors.primary}
        />
        <StatCard
          icon="flame"
          label="Calories"
          value={formatCalories(stats.totalCalories)}
          color={colors.error}
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
        <View style={styles.profileHero}>
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
            <View style={[styles.editBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
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

        <View style={styles.sectionDivider} />

        {/* ── Statistics Section ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text variant="extraSmall" weight="semiBold" color={colors.primary} style={styles.sectionLabel}>
            STATISTICS
          </Text>

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
            <View style={styles.emptyStats}>
              <Ionicons name="stats-chart-outline" size={36} color={colors.primary} style={{ marginBottom: 12 }} />
              <Text variant="medium" weight="medium" color={colors.textSecondary} align="center">
                No activities yet
              </Text>
              <Text variant="small" color={colors.textSecondary} align="center">
                Start tracking to see your stats!
              </Text>
            </View>
          )}
        </View>

        <View style={styles.sectionDivider} />

        {/* Progress Charts */}
        {allActivities.length > 0 && (
          <ProgressChartCard activities={allActivities} units={settings?.units || 'metric'} />
        )}

        {/* ── Profile Details ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text variant="extraSmall" weight="semiBold" color={colors.primary} style={styles.sectionLabel}>
            DETAILS
          </Text>

          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Ionicons name="person-outline" size={18} color={colors.primary} />
            <View style={styles.detailContent}>
              <Text variant="extraSmall" color={colors.textSecondary}>Name</Text>
              <Text variant="regular" weight="medium" color={colors.textPrimary}>
                {profile?.name}
              </Text>
            </View>
          </View>

          {profile?.weight && (
            <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Ionicons name="scale-outline" size={18} color={colors.success} />
              <View style={styles.detailContent}>
                <Text variant="extraSmall" color={colors.textSecondary}>Weight</Text>
                <Text variant="regular" weight="medium" color={colors.textPrimary}>
                  {profile.weight} kg
                </Text>
              </View>
            </View>
          )}

          {profile?.height && (
            <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Ionicons name="resize-outline" size={18} color={colors.info} />
              <View style={styles.detailContent}>
                <Text variant="extraSmall" color={colors.textSecondary}>Height</Text>
                <Text variant="regular" weight="medium" color={colors.textPrimary}>
                  {profile.height} cm
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          {/* Fading overlay */}
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.modalOverlayBg, { opacity: editOverlayAnim }]}
          >
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeEditModal} />
          </Animated.View>

          {/* Sliding content */}
          <Animated.View style={[styles.modalContent, { transform: [{ translateY: editSlideAnim }] }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text variant="medium" weight="bold" color={colors.textPrimary}>
                Edit Profile
              </Text>
              <TouchableOpacity onPress={closeEditModal}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text variant="small" weight="medium" color={colors.textSecondary}>
                  Name *
                </Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.disabled}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text variant="small" weight="medium" color={colors.textSecondary}>
                  Weight (kg)
                </Text>
                <TextInput
                  style={styles.input}
                  value={editWeight}
                  onChangeText={setEditWeight}
                  placeholder="Enter your weight"
                  placeholderTextColor={colors.disabled}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text variant="small" weight="medium" color={colors.textSecondary}>
                  Height (cm)
                </Text>
                <TextInput
                  style={styles.input}
                  value={editHeight}
                  onChangeText={setEditHeight}
                  placeholder="Enter your height"
                  placeholderTextColor={colors.disabled}
                  keyboardType="decimal-pad"
                />
              </View>

              <Text variant="extraSmall" color={colors.textSecondary} style={styles.helpText}>
                Weight and height are used for calorie calculations
              </Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={closeEditModal}
                style={styles.modalButton}
              />
              <Button
                title="Save"
                variant="primary"
                onPress={handleSaveProfile}
                style={styles.modalButton}
              />
            </View>
          </Animated.View>
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
                      <Ionicons name="close-outline" size={20} color={colors.error} />
                      <Text style={styles.imageViewerButtonTextDelete}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.imageViewerButton, { backgroundColor: colors.success }]}
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
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
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

const createStyles = (colors: typeof LightColors) => StyleSheet.create({
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },

  // ── Sections ──────────────────────────────────────────────────────────
  section: {
    marginBottom: 8,
  },
  sectionLabel: {
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 16,
  },

  // ── Stats ─────────────────────────────────────────────────────────────
  statsCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
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
  },
  recordsContainer: {
    marginTop: Spacing.lg,
  },

  // ── Tab bar ───────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {},
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2.5,
    borderRadius: 2,
  },

  // ── Details ──────────────────────────────────────────────────────────
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailContent: {
    flex: 1,
  },

  // ── Modals ────────────────────────────────────────────────────────────
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlayBg: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: BorderRadius.extraLarge,
    borderTopRightRadius: BorderRadius.extraLarge,
    maxHeight: '80%',
    ...Shadows.large,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textPrimary,
    backgroundColor: colors.surface,
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
    borderTopColor: colors.border,
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
    color: colors.error,
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },
  imageViewerButtonTextUpdate: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },
});
