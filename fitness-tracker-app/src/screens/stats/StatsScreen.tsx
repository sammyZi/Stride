/**
 * StatsScreen Component
 * Main statistics and analytics dashboard with tab navigation
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/common/Text';
import { StatCard } from '../../components/stats/StatCard';
import { PersonalRecordsCard } from '../../components/stats/PersonalRecordsCard';
import { GoalsDashboard } from '../../components/goals/GoalsDashboard';
import { DistanceChart, PaceChart } from '../../components/charts';
import { useStatistics } from '../../hooks/useStatistics';
import { useActivityHistory } from '../../hooks/useActivityHistory';
import { useGoals } from '../../hooks/useGoals';
import { useSettings } from '../../context';
import { useNavigation } from '@react-navigation/native';
import { StatsPeriod } from '../../types';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatCalories,
} from '../../utils/formatting';

type TabType = 'week' | 'month' | 'allTime';

const TABS: { key: TabType; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'allTime', label: 'All Time' },
];

export const StatsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('week');
  const { settings } = useSettings();
  const units = settings.units;
  const navigation = useNavigation();

  const { stats, loading, refresh } = useStatistics(activeTab as StatsPeriod);
  const { activities } = useActivityHistory({ autoLoad: true });
  const { activeGoals } = useGoals();

  // Filter activities for current period
  const periodActivities = useMemo(() => {
    if (activeTab === 'allTime') {
      return activities;
    }

    const now = Date.now();
    const startDate =
      activeTab === 'week'
        ? now - 7 * 24 * 60 * 60 * 1000
        : now - 30 * 24 * 60 * 60 * 1000;

    return activities.filter((a) => a.startTime >= startDate);
  }, [activities, activeTab]);

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

  const renderSummaryCards = () => {
    if (!stats) return null;

    return (
      <View style={styles.summaryGrid}>
        <StatCard
          icon="map"
          label="Total Distance"
          value={formatDistance(stats.totalDistance, units)}
          color={Colors.primary}
        />
        <StatCard
          icon="time"
          label="Total Time"
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
              ? formatPace(stats.averagePace, units)
              : '--:-- /km'
          }
          color={Colors.warning}
        />
        <StatCard
          icon="walk"
          label="Total Steps"
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

  const renderCharts = () => {
    if (activeTab === 'allTime' || periodActivities.length === 0) {
      return null;
    }

    return (
      <View style={styles.chartsSection}>
        <View style={styles.chartContainer}>
          <Text variant="mediumLarge" weight="semiBold" style={styles.chartTitle}>
            Distance Trend
          </Text>
          <DistanceChart
            activities={periodActivities}
            units={units}
            period={activeTab}
          />
        </View>

        <View style={styles.chartContainer}>
          <Text variant="mediumLarge" weight="semiBold" style={styles.chartTitle}>
            Pace Improvement
          </Text>
          <PaceChart
            activities={periodActivities}
            units={units}
            period={activeTab}
          />
        </View>
      </View>
    );
  };

  const renderPersonalRecords = () => {
    if (!stats) return null;

    return (
      <View style={styles.recordsSection}>
        <PersonalRecordsCard records={stats.personalRecords} units={units} />
      </View>
    );
  };

  const renderGoalsDashboard = () => {
    if (activeGoals.length === 0) return null;

    return (
      <View style={styles.goalsSection}>
        <GoalsDashboard
          goals={activeGoals}
          units={units}
          onViewAll={() => navigation.navigate('Goals' as never)}
        />
      </View>
    );
  };

  const renderComparison = () => {
    if (activeTab === 'allTime' || !stats || stats.totalActivities === 0) {
      return null;
    }

    const avgDistancePerActivity = stats.totalDistance / stats.totalActivities;
    const avgDurationPerActivity = stats.totalDuration / stats.totalActivities;

    return (
      <View style={styles.comparisonSection}>
        <Text variant="mediumLarge" weight="semiBold" style={styles.sectionTitle}>
          Averages
        </Text>
        <View style={styles.comparisonGrid}>
          <View style={styles.comparisonItem}>
            <Text variant="small" color={Colors.textSecondary}>
              Per Activity
            </Text>
            <Text variant="large" weight="semiBold" style={styles.comparisonValue}>
              {formatDistance(avgDistancePerActivity, units)}
            </Text>
          </View>
          <View style={styles.comparisonItem}>
            <Text variant="small" color={Colors.textSecondary}>
              Duration
            </Text>
            <Text variant="large" weight="semiBold" style={styles.comparisonValue}>
              {formatDuration(avgDurationPerActivity)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text variant="large" weight="semiBold" style={styles.emptyTitle}>
        No Data Yet
      </Text>
      <Text variant="medium" color={Colors.textSecondary} align="center" style={styles.emptyText}>
        Start tracking activities to see your statistics and progress!
      </Text>
    </View>
  );

  if (loading && !stats) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text variant="large" weight="bold">
            Statistics
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const hasData = stats && stats.totalActivities > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="large" weight="bold">
          Statistics
        </Text>
      </View>

      {renderTabBar()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={Colors.primary}
          />
        }
      >
        {hasData ? (
          <>
            {renderGoalsDashboard()}
            {renderSummaryCards()}
            {renderCharts()}
            {renderComparison()}
            {renderPersonalRecords()}
          </>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    height: 60,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.large,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeTab: {
    backgroundColor: `${Colors.primary}15`,
    borderColor: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  chartsSection: {
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  chartContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
  },
  chartTitle: {
    marginBottom: Spacing.md,
  },
  goalsSection: {
    marginBottom: Spacing.lg,
  },
  recordsSection: {
    marginBottom: Spacing.lg,
  },
  comparisonSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  comparisonGrid: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  comparisonItem: {
    flex: 1,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
  },
  comparisonValue: {
    marginTop: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    marginBottom: Spacing.md,
  },
  emptyText: {
    lineHeight: 24,
  },
});
