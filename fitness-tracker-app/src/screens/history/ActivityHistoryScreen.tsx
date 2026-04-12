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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/common';
import { ActivityCard } from '../../components/activity';
import { EmptyState } from '../../components/common';
import { MonthlyCalendarCard } from '../../components/stats/MonthlyCalendarCard';
import { useActivityHistory } from '../../hooks';
import { Activity, ActivityType, UnitSystem } from '../../types';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
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
      <Text variant="large" weight="bold" color={Colors.textPrimary}>
        Activity History
      </Text>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setFilterModalVisible(true)}
      >
        <Ionicons name="filter" size={20} color={Colors.primary} />
        {(activityTypeFilter !== 'all' || dateRangeFilter !== 'all') && (
          <View style={styles.filterBadge} />
        )}
      </TouchableOpacity>
    </View>
  ), [activityTypeFilter, dateRangeFilter]);

  const renderCalendarHeader = React.useCallback(() => (
    <View>
      <View style={styles.header}>
        <Text variant="large" weight="bold" color={Colors.textPrimary}>
          Activity History
        </Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="filter" size={20} color={Colors.primary} />
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
            <Text variant="small" weight="semiBold" color={Colors.textSecondary}>
              All Activities
            </Text>
            <View style={styles.separatorLine} />
          </View>
        </>
      )}
    </View>
  ), [activityTypeFilter, dateRangeFilter, activities, units]);

  const renderListFooter = React.useCallback(() => {
    if (!hasMore || activities.length === 0) return null;

    return (
      <View style={styles.footer}>
        <Text variant="small" color={Colors.textSecondary}>
          {loading ? 'Loading more...' : 'Pull to load more'}
        </Text>
      </View>
    );
  }, [hasMore, activities.length, loading]);

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
            <Text variant="medium" weight="semiBold">
              Filter Activities
            </Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
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
                    color={dateRangeFilter === range ? Colors.surface : Colors.textPrimary}
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
              <Text variant="regular" weight="medium" color={Colors.textSecondary}>
                Clear Filters
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text variant="regular" weight="semiBold" color={Colors.surface}>
                Apply
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.statusBarSpacer} />
      {loading && activities.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
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
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          disableIntervalMomentum={true}
        />
      )}
      {renderFilterModal()}
    </View>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const ActivityHistoryScreen = React.memo(ActivityHistoryScreenComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 44,
  },
  statusBarSpacer: {
    height: 0, // Padding is on container now
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
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.error,
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
    backgroundColor: Colors.surface,
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
    color: Colors.textSecondary,
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
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
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.border,
  },
});
