/**
 * GoalsScreen Component
 * Displays and manages user goals
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
import { Goal } from '../../types';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

export const GoalsScreen: React.FC = () => {
  const { activeGoals, achievedGoals, loading, createGoal, deleteGoal, refresh } = useGoals();
  const { settings } = useSettings();
  const { modalState, showConfirm, hideModal } = useConfirmModal();
  const [createModalVisible, setCreateModalVisible] = useState(false);
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

  const handleGoalPress = (goal: Goal) => {
    setSelectedGoal(goal);
    showConfirm(
      'Goal Options',
      'What would you like to do with this goal?',
      [
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
        <Text variant="mediumLarge" weight="semiBold" style={styles.sectionTitle}>
          Active Goals
        </Text>
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
          <Text variant="mediumLarge" weight="semiBold">
            Achieved Goals
          </Text>
          <View style={styles.achievementBadge}>
            <Ionicons name="trophy" size={16} color={Colors.warning} />
            <Text variant="small" weight="medium" color={Colors.warning}>
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

  const hasGoals = activeGoals.length > 0 || achievedGoals.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="large" weight="bold">
          Goals
        </Text>
        {hasGoals && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setCreateModalVisible(true)}
          >
            <Ionicons name="add-circle" size={28} color={Colors.primary} />
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
          />
        }
      >
        {hasGoals ? (
          <>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
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
    padding: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: `${Colors.warning}20`,
    borderRadius: BorderRadius.medium,
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
