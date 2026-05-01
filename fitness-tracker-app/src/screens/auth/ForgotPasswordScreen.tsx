/**
 * Forgot Password Screen
 *
 * Allows the user to request a password reset email.
 * Uses an in-screen modal for success/error feedback.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button, Text } from '../../components/common';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context';
import { useTheme } from '../../hooks';

// ── Validation ───────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_REGEX.test(email.trim())) return 'Please enter a valid email address';
  return undefined;
}

// ── Component ────────────────────────────────────────────────────────────────

export const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { resetPassword } = useAuth();
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const handleReset = useCallback(async () => {
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    setIsLoading(true);
    try {
      const result = await resetPassword(email.trim());
      if (result.success) {
        setModalSuccess(true);
        setModalMessage('If an account exists with that email, a password reset link has been sent. Check your inbox.');
      } else {
        setModalSuccess(false);
        setModalMessage(result.error?.message ?? 'Failed to send reset email. Please try again.');
      }
    } catch {
      setModalSuccess(false);
      setModalMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
      setModalVisible(true);
    }
  }, [email, resetPassword]);

  const handleModalDismiss = useCallback(() => {
    setModalVisible(false);
    if (modalSuccess) {
      navigation.goBack();
    }
  }, [modalSuccess, navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Back header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.iconHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="key-outline" size={40} color={colors.primary} />
            </View>
            <Text variant="large" weight="bold" color={colors.textPrimary} style={styles.title}>
              Reset Password
            </Text>
            <Text variant="regular" color={colors.textSecondary} style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (emailError) setEmailError(validateEmail(t));
              }}
              error={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              leftIcon={<Ionicons name="mail-outline" size={20} color={colors.textSecondary} />}
              accessibilityLabel="Email address"
            />

            <Button
              title="Send Reset Link"
              variant="primary"
              size="large"
              fullWidth
              loading={isLoading}
              disabled={isLoading}
              onPress={handleReset}
              style={styles.submitButton}
            />
          </View>

          {/* Back to login */}
          <View style={styles.footer}>
            <Text variant="regular" color={colors.textSecondary}>
              Remember your password?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text variant="regular" weight="semiBold" color={colors.primary}>
                Log In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Result modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleModalDismiss}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalIcon, { backgroundColor: modalSuccess ? Colors.success + '15' : Colors.error + '15' }]}>
              <Ionicons
                name={modalSuccess ? 'checkmark-circle' : 'alert-circle'}
                size={40}
                color={modalSuccess ? Colors.success : Colors.error}
              />
            </View>
            <Text variant="large" weight="bold" color={colors.textPrimary} style={styles.modalTitle}>
              {modalSuccess ? 'Email Sent' : 'Something Went Wrong'}
            </Text>
            <Text variant="regular" color={colors.textSecondary} style={styles.modalMessage}>
              {modalMessage}
            </Text>
            <Button
              title={modalSuccess ? 'Back to Login' : 'Try Again'}
              variant="primary"
              size="medium"
              fullWidth
              onPress={handleModalDismiss}
              style={styles.modalButton}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    justifyContent: 'center',
  },
  iconHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: { marginBottom: Spacing.sm },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },
  form: { marginBottom: Spacing.xl },
  submitButton: { marginTop: Spacing.md },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    borderRadius: BorderRadius.extraLarge,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  modalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: { marginBottom: Spacing.sm, textAlign: 'center' },
  modalMessage: { textAlign: 'center', lineHeight: 20, marginBottom: Spacing.lg },
  modalButton: { marginTop: Spacing.sm },
});
