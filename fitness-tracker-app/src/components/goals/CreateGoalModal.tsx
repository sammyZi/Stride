/**
 * CreateGoalModal Component
 * Modal for creating new goals
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, ConfirmModal } from '../common';
import { Button } from '../common/Button';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import { GoalType, GoalPeriod } from '../../types';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface CreateGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (type: GoalType, target: number, period: GoalPeriod) => Promise<void>;
  units: 'metric' | 'imperial';
}

type GoalTypeOption = {
  type: GoalType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  unit: string;
};

export const CreateGoalModal: React.FC<CreateGoalModalProps> = ({
  visible,
  onClose,
  onCreate,
  units,
}) => {
  const { modalState, showConfirm, hideModal } = useConfirmModal();
  const [selectedType, setSelectedType] = useState<GoalType>('distance');
  const [selectedPeriod, setSelectedPeriod] = useState<GoalPeriod>('weekly');
  const [targetValue, setTargetValue] = useState('');
  const [creating, setCreating] = useState(false);

  const goalTypes: GoalTypeOption[] = [
    {
      type: 'distance',
      label: 'Distance',
      icon: 'navigate',
      placeholder: units === 'imperial' ? 'e.g., 10' : 'e.g., 15',
      unit: units === 'imperial' ? 'miles' : 'km',
    },
    {
      type: 'frequency',
      label: 'Activities',
      icon: 'fitness',
      placeholder: 'e.g., 5',
      unit: 'activities',
    },
    {
      type: 'duration',
      label: 'Duration',
      icon: 'time',
      placeholder: 'e.g., 120',
      unit: 'minutes',
    },
  ];

  const periods: { period: GoalPeriod; label: string }[] = [
    { period: 'weekly', label: 'Weekly' },
    { period: 'monthly', label: 'Monthly' },
  ];

  const handleCreate = async () => {
    try {
      const value = parseFloat(targetValue);

      if (!value || value <= 0) {
        showConfirm(
          'Invalid Input',
          'Please enter a valid target value',
          [{ text: 'OK', onPress: hideModal, style: 'default' }],
          { icon: 'alert-circle', iconColor: Colors.error }
        );
        return;
      }

      setCreating(true);

      // Convert target to appropriate units
      let target = value;
      if (selectedType === 'distance') {
        // Convert to meters
        target = units === 'imperial' ? value * 1609.34 : value * 1000;
      } else if (selectedType === 'duration') {
        // Convert minutes to seconds
        target = value * 60;
      }

      await onCreate(selectedType, target, selectedPeriod);

      // Reset form
      setTargetValue('');
      setSelectedType('distance');
      setSelectedPeriod('weekly');
      onClose();
    } catch (error) {
      console.error('Error creating goal:', error);
      showConfirm(
        'Error',
        'Failed to create goal. Please try again.',
        [{ text: 'OK', onPress: hideModal, style: 'default' }],
        { icon: 'alert-circle', iconColor: Colors.error }
      );
    } finally {
      setCreating(false);
    }
  };

  const selectedGoalType = goalTypes.find(g => g.type === selectedType)!;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeader}>
            <Text variant="large" weight="bold" color={Colors.textPrimary}>
              Create New Goal
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
            {/* Goal Type Selection */}
            <View style={styles.section}>
              <Text variant="medium" weight="semiBold" style={styles.sectionTitle}>
                Goal Type
              </Text>
              <View style={styles.optionsGrid}>
                {goalTypes.map((goalType) => (
                  <TouchableOpacity
                    key={goalType.type}
                    style={[
                      styles.optionCard,
                      selectedType === goalType.type && styles.optionCardSelected,
                    ]}
                    onPress={() => setSelectedType(goalType.type)}
                  >
                    <Ionicons
                      name={goalType.icon}
                      size={28}
                      color={
                        selectedType === goalType.type ? Colors.primary : Colors.textSecondary
                      }
                    />
                    <Text
                      variant="small"
                      weight="medium"
                      color={
                        selectedType === goalType.type ? Colors.primary : Colors.textSecondary
                      }
                    >
                      {goalType.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Period Selection */}
            <View style={styles.section}>
              <Text variant="medium" weight="semiBold" style={styles.sectionTitle}>
                Period
              </Text>
              <View style={styles.periodButtons}>
                {periods.map((period) => (
                  <TouchableOpacity
                    key={period.period}
                    style={[
                      styles.periodButton,
                      selectedPeriod === period.period && styles.periodButtonSelected,
                    ]}
                    onPress={() => setSelectedPeriod(period.period)}
                  >
                    <Text
                      variant="medium"
                      weight="medium"
                      color={
                        selectedPeriod === period.period ? Colors.surface : Colors.textSecondary
                      }
                    >
                      {period.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Target Value Input */}
            <View style={styles.section}>
              <Text variant="medium" weight="semiBold" style={styles.sectionTitle}>
                Target
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={targetValue}
                  onChangeText={setTargetValue}
                  placeholder={selectedGoalType.placeholder}
                  placeholderTextColor={Colors.disabled}
                  keyboardType="decimal-pad"
                />
                <Text variant="medium" color={Colors.textSecondary} style={styles.inputUnit}>
                  {selectedGoalType.unit}
                </Text>
              </View>
              <Text variant="extraSmall" color={Colors.textSecondary} style={styles.helpText}>
                Set a realistic target for your {selectedPeriod} goal
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={styles.actionButton}
              disabled={creating}
            />
            <Button
              title={creating ? 'Creating...' : 'Create Goal'}
              variant="primary"
              onPress={handleCreate}
              style={styles.actionButton}
              disabled={creating || !targetValue}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

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
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.extraLarge,
    borderTopRightRadius: BorderRadius.extraLarge,
    maxHeight: '85%',
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  optionCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.medium,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  periodButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.medium,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  periodButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.surface,
    paddingRight: Spacing.lg,
  },
  input: {
    flex: 1,
    height: 56,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textPrimary,
  },
  inputUnit: {
    marginLeft: Spacing.sm,
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
  actionButton: {
    flex: 1,
  },
});
