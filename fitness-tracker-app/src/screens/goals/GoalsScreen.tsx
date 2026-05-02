/**
 * GoalsScreen Component
 * Displays and manages user goals with polished UI
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, ConfirmModal } from '../../components/common';
import { GoalCard } from '../../components/goals/GoalCard';
import { CreateGoalModal } from '../../components/goals/CreateGoalModal';
import { useGoals } from '../../hooks/useGoals';
import { useSettings } from '../../context';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import { useTheme } from '../../hooks';
import { Goal } from '../../types';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

export const GoalsScreen: React.FC = () => {
  const { activeGoals, achievedGoals, loading, createGoal, updateGoal, deleteGoal, refresh } = useGoals();
  const { settings } = useSettings();
  const { colors } = useTheme();
  const { modalState, showConfirm, hideModal } = useConfirmModal();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const handleCreateGoal = async (
    type: 'distance' | 'frequency' | 'duration',
    target: number,
    period: 'weekly' | 'monthly'
  ) => {
    try {
      await createGoal(type, target, period);
      showConfirm(
        'Success',
        'Goal created successfully!',
        [{ text: 'OK', onPress: hideModal, style: 'default' }],
        { icon: 'checkmark-circle', iconColor: Colors.success }
      );
    } catch (error) {
      console.error('Error creating goal:', error);
      showConfirm(
        'Error',
        'Failed to create goal',
        [{ text: 'OK', onPress: hideModal, style: 'default' }],
        { icon: 'alert-circle', iconColor: Colors.error }
      );
    }
  };

  const handleEditGoal = async (
    type: 'distance' | 'frequency' | 'duration',
    target: number,
    period: 'weekly' | 'monthly'
  ) => {
    if (!selectedGoal) return;
    try {
      await updateGoal(selectedGoal.id, { type, target, period });
      setEditModalVisible(false);
      setSelectedGoal(null);
      showConfirm(
        'Success',
        'Goal updated successfully!',
        [{ text: 'OK', onPress: hideModal, style: 'default' }],
        { icon: 'checkmark-circle', iconColor: Colors.success }
      );
    } catch (error) {
      console.error('Error updating goal:', error);
      showConfirm(
        'Error',
        'Failed to update goal',
        [{ text: 'OK', onPress: hideModal, style: 'default' }],
        { icon: 'alert-circle', iconColor: Colors.error }
      );
    }
  };

  const handleGoalPress = (goal: Goal) => {
    setSelectedGoal(goal);
    showConfirm(
      'Goal Options',
      'What would you like to do with this goal?',
      [
        {
          text: 'Edit',
          onPress: () => {
            hideModal();
            setTimeout(() => {
              setEditModalVisible(true);
            }, 300);
          },
          style: 'default',
        },
        {
          text: 'Delete',
          onPress: () => {
            hideModal();
            setTimeout(() => handleDeleteGoal(goal.id), 300);
          },
          style: 'destructive',
        },
        {
          text: 'Cancel',
          onPress: hideModal,
          style: 'cancel',
        },
      ],
      { icon: 'options', iconColor: Colors.primary }
    );
  };

  const handleDeleteGoal = async (goalId: string) => {
    showConfirm(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        {
          text: 'Cancel',
          onPress: hideModal,
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await deleteGoal(goalId);
              hideModal();
              setTimeout(() => {
                showConfirm(
                  'Success',
                  'Goal deleted successfully',
                  [{ text: 'OK', onPress: hideModal, style: 'default' }],
                  { icon: 'checkmark-circle', iconColor: Colors.success }
                );
              }, 300);
            } catch (error) {
              console.error('Error deleting goal:', error);
              hideModal();
              setTimeout(() => {
                showConfirm(
                  'Error',
                  'Failed to delete goal',
                  [{ text: 'OK', onPress: hideModal, style: 'default' }],
                  { icon: 'alert-circle', iconColor: Colors.error }
                );
              }, 300);
            }
          },
          style: 'destructive',
        },
      ],
      { icon: 'trash', iconColor: Colors.error }
    );
  };

  const hasGoals = activeGoals.length > 0 || achievedGoals.length > 0;
  const totalGoals = activeGoals.length + achievedGoals.length;

  // ── Summary cards ──────────────────────────────────────────────────────

  const renderSummary = () => {
    if (!hasGoals) return null;

    const stats = [
      { label: 'Active', value: activeGoals.length, color: colors.primary, icon: 'flame' as const },
      { label: 'Achieved', value: achievedGoals.length, color: Colors.success, icon: 'trophy' as const },
      { label: 'Total', value: totalGoals, color: Colors.warning, icon: 'flag' as const },
    ];

    return (
      <View style={styles.summaryRow}>
        {stats.map((stat, i) => (
          <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.statIconBg, { backgroundColor: stat.color + '18' }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text variant="large" weight="bold" color={colors.textPrimary}>
              {stat.value}
            </Text>
            <Text variant="extraSmall" color={colors.textSecondary}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // ── Empty state ────────────────────────────────────────────────────────

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '12' }]}>
        <Ionicons name="flag-outline" size={56} color={colors.primary} />
      </View>
      <Text variant="large" weight="semiBold" color={colors.textPrimary} style={styles.emptyTitle}>
        No Goals Yet
      </Text>
      <Text variant="medium" color={colors.textSecondary} align="center" style={styles.emptyText}>
        Set goals to stay motivated and{'\n'}track your progress!
      </Text>
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: colors.primary }]}
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle-outline" size={22} color="#fff" />
        <Text variant="medium" weight="semiBold" color="#fff">
          Create Your First Goal
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ── Active goals ──────────────────────────────────────────────────────

  const renderActiveGoals = () => {
    if (activeGoals.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
            <Text variant="medium" weight="semiBold" color={colors.textPrimary}>
              Active Goals
            </Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.primary + '18' }]}>
            <Text variant="extraSmall" weight="bold" color={colors.primary}>
              {activeGoals.length}
            </Text>
          </View>
        </View>
        <View style={styles.goalsGrid}>
          {activeGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              units={settings.units}
              onPress={() => handleGoalPress(goal)}
            />
          ))}
        </View>
      </View>
    );
  };

  // ── Achieved goals ────────────────────────────────────────────────────

  const renderAchievedGoals = () => {
    if (achievedGoals.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="trophy" size={16} color={Colors.warning} />
            <Text variant="medium" weight="semiBold" color={colors.textPrimary}>
              Achieved
            </Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: Colors.warning + '18' }]}>
            <Text variant="extraSmall" weight="bold" color={Colors.warning}>
              {achievedGoals.length}
            </Text>
          </View>
        </View>
        <View style={styles.goalsGrid}>
          {achievedGoals.slice(0, 5).map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              units={settings.units}
              onPress={() => handleGoalPress(goal)}
            />
          ))}
        </View>
        {achievedGoals.length > 5 && (
          <Text variant="small" color={colors.textSecondary} align="center" style={styles.moreText}>
            +{achievedGoals.length - 5} more achieved goals
          </Text>
        )}
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text variant="large" weight="bold" color={colors.textPrimary}>
          Goals
        </Text>
        {hasGoals && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {hasGoals ? (
          <>
            {renderSummary()}
            {renderActiveGoals()}
            {renderAchievedGoals()}
            <View style={{ height: 32 }} />
          </>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      <CreateGoalModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreate={handleCreateGoal}
        units={settings.units}
      />

      {/* Edit Goal Modal */}
      {selectedGoal && (
        <CreateGoalModal
          visible={editModalVisible}
          onClose={() => {
            setEditModalVisible(false);
            setSelectedGoal(null);
          }}
          onCreate={handleEditGoal}
          units={settings.units}
          title="Edit Goal"
          initialType={selectedGoal.type}
          initialPeriod={selectedGoal.period}
          initialTarget={
            selectedGoal.type === 'distance'
              ? (settings.units === 'imperial'
                ? (selectedGoal.target / 1609.34).toFixed(1)
                : (selectedGoal.target / 1000).toFixed(1))
              : selectedGoal.type === 'duration'
                ? (selectedGoal.target / 60).toFixed(0)
                : selectedGoal.target.toString()
          }
        />
      )}

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
    </SafeAreaView>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  // ── Summary ────────────────────────────────────────────────────────────
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 4,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  // ── Sections ───────────────────────────────────────────────────────────
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  countBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  goalsGrid: {
    gap: 12,
  },
  moreText: {
    marginTop: Spacing.md,
  },

  // ── Empty state ────────────────────────────────────────────────────────
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    marginBottom: 8,
  },
  emptyText: {
    lineHeight: 22,
    marginBottom: 32,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
  },
});
