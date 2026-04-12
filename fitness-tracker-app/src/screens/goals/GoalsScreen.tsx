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
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, ConfirmModal } from '../../components/common';
import { Card } from '../../components/common/Card';
import { GoalCard } from '../../components/goals/GoalCard';
import { CreateGoalModal } from '../../components/goals/CreateGoalModal';
import { useGoals } from '../../hooks/useGoals';
import { useSettings } from '../../context';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import { Goal } from '../../types';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

export const GoalsScreen: React.FC = () => {
  const { activeGoals, achievedGoals, loading, createGoal, updateGoal, deleteGoal, refresh } = useGoals();
  const { settings } = useSettings();
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

  const renderSummaryStrip = () => {
    if (!hasGoals) return null;
    const totalGoals = activeGoals.length + achievedGoals.length;
    return (
      <Card variant="outlined" style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: Colors.primary }]} />
            <Text variant="large" weight="bold" color={Colors.textPrimary}>
              {activeGoals.length}
            </Text>
            <Text variant="extraSmall" color={Colors.textSecondary}>Active</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: Colors.success }]} />
            <Text variant="large" weight="bold" color={Colors.textPrimary}>
              {achievedGoals.length}
            </Text>
            <Text variant="extraSmall" color={Colors.textSecondary}>Achieved</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: Colors.warning }]} />
            <Text variant="large" weight="bold" color={Colors.textPrimary}>
              {totalGoals}
            </Text>
            <Text variant="extraSmall" color={Colors.textSecondary}>Total</Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="flag-outline" size={64} color={Colors.disabled} />
      </View>
      <Text variant="large" weight="semiBold" style={styles.emptyTitle}>
        No Goals Yet
      </Text>
      <Text variant="medium" color={Colors.textSecondary} align="center" style={styles.emptyText}>
        Set goals to stay motivated and track your progress!
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setCreateModalVisible(true)}
      >
        <Ionicons name="add" size={24} color={Colors.surface} />
        <Text variant="medium" weight="semiBold" color={Colors.surface}>
          Create Your First Goal
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderActiveGoals = () => {
    if (activeGoals.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="mediumLarge" weight="semiBold" color={Colors.textPrimary}>
            Active Goals
          </Text>
          <Text variant="small" color={Colors.textSecondary}>
            {activeGoals.length} {activeGoals.length === 1 ? 'goal' : 'goals'}
          </Text>
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

  const renderAchievedGoals = () => {
    if (achievedGoals.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.achievedTitleRow}>
            <Ionicons name="trophy" size={18} color={Colors.warning} />
            <Text variant="mediumLarge" weight="semiBold" color={Colors.textPrimary}>
              Achieved
            </Text>
          </View>
          <View style={styles.achievementBadge}>
            <Text variant="small" weight="bold" color={Colors.warning}>
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
          <Text variant="small" color={Colors.textSecondary} align="center" style={styles.moreText}>
            +{achievedGoals.length - 5} more achieved goals
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="large" weight="bold" color={Colors.textPrimary}>
          Goals
        </Text>
        {hasGoals && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setCreateModalVisible(true)}
          >
            <Ionicons name="add" size={20} color={Colors.surface} />
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
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {hasGoals ? (
          <>
            {renderSummaryStrip()}
            {renderActiveGoals()}
            {renderAchievedGoals()}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 44,
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  summaryCard: {
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  achievedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  achievementBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${Colors.warning}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalsGrid: {
    gap: Spacing.md,
  },
  moreText: {
    marginTop: Spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${Colors.disabled}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    marginBottom: Spacing.md,
  },
  emptyText: {
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.large,
  },
});
