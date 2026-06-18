/**
 * ActivityHistoryScreen
 * Displays a scrollable list of past activities with filtering and pull-to-refresh
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  StatusBar,
  Platform,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/common';
import { ActivityCard } from '../../components/activity';
import { EmptyState } from '../../components/common';
import { MonthlyCalendarCard } from '../../components/stats/MonthlyCalendarCard';
import { useActivityHistory, useTheme } from '../../hooks';
import { Activity, ActivityType, UnitSystem } from '../../types';
import { LightColors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import StorageService from '../../services/storage/StorageService';

interface ActivityHistoryScreenProps {
  navigation: any;
  route?: any;
}

const ActivityHistoryScreenComponent: React.FC<ActivityHistoryScreenProps> = ({ navigation, route }) => {
  const {
    activities,
    loading,
    refreshing,
    hasMore,
    activityTypeFilter,
    dateRangeFilter,
    setActivityTypeFilter,
    setDateRangeFilter,
    refresh,
    loadMore,
  } = useActivityHistory();

  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  // Filter modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [units, setUnits] = useState<UnitSystem>('metric');

  // Load units from settings
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await StorageService.getSettings();
      setUnits(settings?.units || 'metric');
    };
    loadSettings();
  }, []);

  // Disable scroll during navigation transitions to prevent flicker.
  // The spring animation transform and scroll gesture conflict on the native thread.
  const [scrollEnabled, setScrollEnabled] = useState(true);

  useEffect(() => {
    const unsubBlur = navigation.addListener('blur', () => {
      setScrollEnabled(false);
    });
    const unsubFocus = navigation.addListener('focus', () => {
      // Wait for the back-transition spring animation to fully settle
      const handle = InteractionManager.runAfterInteractions(() => {
        setScrollEnabled(true);
      });
      return () => handle.cancel();
    });
    return () => { unsubBlur(); unsubFocus(); };
  }, [navigation]);

  // Silent refresh when coming back after delete (no loading indicator)
  useFocusEffect(
    useCallback(() => {
      // Reset navigation guard when screen comes into focus
      isNavigatingRef.current = false;
      
      if (route?.params?.refresh) {
        console.log('Refresh param detected, silently refreshing list');
        // Use silent refresh to avoid flickering
        refresh(true);
        // Clear the param immediately to prevent loops
        navigation.setParams({ refresh: undefined });
      }
    }, [route?.params?.refresh, navigation, refresh])
  );

  const isNavigatingRef = React.useRef(false);

  const handleActivityPress = React.useCallback((activity: Activity) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    navigation.navigate('ActivityDetail', { activityId: activity.id });
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 500);
  }, [navigation]);

  const renderActivityCard = React.useCallback(
    ({ item }: { item: Activity }) => (
      <ActivityCard
        activity={item}
        onPress={() => handleActivityPress(item)}
        units={units}
      />
    ),
    [handleActivityPress, units]
  );

  const keyExtractor = React.useCallback((item: Activity) => item.id, []);

  const getItemLayout = React.useCallback(
    (_: any, index: number) => ({
      length: 120, // Approximate card height
      offset: 120 * index,
      index,
    }),
    []
  );

  const handleRefresh = () => {
    refresh();
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadMore();
    }
  };

  const renderListHeader = React.useCallback(() => (
    <View style={styles.header}>
      <Text variant="large" weight="bold" color={colors.textPrimary}>
        Activity History
      </Text>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setFilterModalVisible(true)}
      >
        <Ionicons name="filter" size={20} color={colors.primary} />
        {(activityTypeFilter !== 'all' || dateRangeFilter !== 'all') && (
          <View style={styles.filterBadge} />
        )}
      </TouchableOpacity>
    </View>
  ), [activityTypeFilter, dateRangeFilter, colors]);

  const renderCalendarHeader = React.useCallback(() => (
    <View>
      <View style={styles.header}>
        <Text variant="large" weight="bold" color={colors.textPrimary}>
          Activity History
        </Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="filter" size={20} color={colors.primary} />
          {(activityTypeFilter !== 'all' || dateRangeFilter !== 'all') && (
            <View style={styles.filterBadge} />
          )}
        </TouchableOpacity>
      </View>
      {activities.length > 0 && (
        <>
          <View style={styles.calendarGap} />
          <MonthlyCalendarCard activities={activities} units={units} />
          <View style={styles.sectionSeparator}>
            <View style={styles.separatorLine} />
            <Text variant="small" weight="semiBold" color={colors.textSecondary}>
              All Activities
            </Text>
            <View style={styles.separatorLine} />
          </View>
        </>
      )}
    </View>
  ), [activityTypeFilter, dateRangeFilter, activities, units, colors]);

  const renderListFooter = React.useCallback(() => {
    if (!hasMore || activities.length === 0) return null;

    return (
      <View style={styles.footer}>
        <Text variant="small" color={colors.textSecondary}>
          {loading ? 'Loading more...' : 'Pull to load more'}
        </Text>
      </View>
    );
  }, [hasMore, activities.length, loading, colors]);

  const renderEmptyState = () => (
    <EmptyState
      icon="fitness-outline"
      title="No Activities Yet"
      message="Start tracking your walks and runs to see them here!"
    />
  );

  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text variant="medium" weight="semiBold" color={colors.textPrimary}>
              Filter Activities
            </Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Date Range Filter */}
          <View style={styles.filterSection}>
            <Text variant="regular" weight="medium" style={styles.filterLabel}>
              Date Range
            </Text>
            <View style={styles.filterOptions}>
              {(['all', 'week', 'month', 'year'] as const).map((range) => (
                <TouchableOpacity
                   key={range}
                   style={[
                     styles.filterOption,
                     dateRangeFilter === range && styles.filterOptionActive,
                   ]}
                   onPress={() => setDateRangeFilter(range)}
                >
                  <Text
                    variant="regular"
                    weight={dateRangeFilter === range ? 'semiBold' : 'regular'}
                    color={dateRangeFilter === range ? colors.surface : colors.textPrimary}
                  >
                    {range === 'all' ? 'All Time' : `Last ${range.charAt(0).toUpperCase() + range.slice(1)}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setActivityTypeFilter('all');
                setDateRangeFilter('all');
              }}
            >
              <Text variant="regular" weight="medium" color={colors.textSecondary}>
                Clear Filters
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text variant="regular" weight="semiBold" color={colors.surface}>
                Apply
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.statusBarSpacer} />
      {loading && activities.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={activities}
          renderItem={renderActivityCard}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderCalendarHeader}
          ListFooterComponent={renderListFooter}
          ListEmptyComponent={!loading ? renderEmptyState : null}
          contentContainerStyle={[
            styles.listContent,
            activities.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
          removeClippedSubviews={false}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={15}
          disableIntervalMomentum={true}
        />
      )}
      {renderFilterModal()}
    </View>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const ActivityHistoryScreen = React.memo(ActivityHistoryScreenComponent);

const createStyles = (colors: typeof LightColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusBarSpacer: {
    height: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.medium,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  footer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: BorderRadius.extraLarge,
    borderTopRightRadius: BorderRadius.extraLarge,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  filterSection: {
    marginBottom: Spacing.xl,
  },
  filterLabel: {
    marginBottom: Spacing.md,
    color: colors.textSecondary,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  filterOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  clearButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.medium,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.medium,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },
  calendarGap: {
    height: Spacing.md,
  },
  sectionSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
});
