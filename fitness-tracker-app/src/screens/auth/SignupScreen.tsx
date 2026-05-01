/**
 * Signup Screen
 *
 * Provides a registration form with email and password inputs,
 * client-side validation, server-side error display, and a
 * loading indicator during the signup request.
 *
 * Requirements: 1.1, 1.3, 1.4, 1.5
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button, Text } from '../../components/common';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context';
import { useTheme } from '../../hooks';

// ── Validation helpers ───────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_REGEX.test(email.trim())) return 'Please enter a valid email address';
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) return 'Password is required';
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  return undefined;
}

function validateConfirmPassword(password: string, confirm: string): string | undefined {
  if (!confirm) return 'Please confirm your password';
  if (password !== confirm) return 'Passwords do not match';
  return undefined;
}

// ── Component ────────────────────────────────────────────────────────────────

export const SignupScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const { signUp, signInWithGoogle } = useAuth();
  const { colors } = useTheme();
  const onSkip = route?.params?.onSkip;

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation & feedback state
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  // Email confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSignup = useCallback(async () => {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    const cErr = validateConfirmPassword(password, confirmPassword);

    setEmailError(eErr);
    setPasswordError(pErr);
    setConfirmError(cErr);
    setServerError(undefined);

    if (eErr || pErr || cErr) return;

    setIsLoading(true);
    try {
      const result = await signUp(email.trim(), password);
      if (result.success && result.emailConfirmationRequired) {
        // Email confirmation needed — show modal
        setShowConfirmModal(true);
      } else if (!result.success) {
        setServerError(result.error?.message ?? 'Signup failed. Please try again.');
      }
      // If success with session, AuthContext handles navigation automatically
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [email, password, confirmPassword, signUp]);

  const handleGoogleSignup = useCallback(async () => {
    setIsGoogleLoading(true);
    setServerError(undefined);
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        setServerError(result.error?.message ?? 'Google sign-in failed. Please try again.');
      }
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  }, [signInWithGoogle]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="person-add" size={40} color={colors.primary} />
            </View>
            <Text variant="large" weight="bold" color={colors.textPrimary} style={styles.title}>
              Create Account
            </Text>
            <Text variant="regular" color={colors.textSecondary} style={styles.subtitle}>
              Sign up to enable cloud sync and keep your data safe
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {serverError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={Colors.error} />
                <Text variant="small" color={Colors.error} style={styles.errorBannerText}>
                  {serverError}
                </Text>
              </View>
            )}

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
              accessibilityHint="Enter your email address to sign up"
            />

            <Input
              label="Password"
              placeholder="Min. 6 characters"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (passwordError) setPasswordError(validatePassword(t));
              }}
              error={passwordError}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              textContentType="newPassword"
              leftIcon={
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
              }
              rightIcon={
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              }
              onRightIconPress={() => setShowPassword((v) => !v)}
              accessibilityLabel="Password"
              accessibilityHint="Enter a password with at least 6 characters"
            />

            <Input
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                if (confirmError) setConfirmError(validateConfirmPassword(password, t));
              }}
              error={confirmError}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              textContentType="newPassword"
              leftIcon={
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
              }
              rightIcon={
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              }
              onRightIconPress={() => setShowConfirmPassword((v) => !v)}
              accessibilityLabel="Confirm password"
              accessibilityHint="Re-enter your password to confirm"
            />

            <Button
              title="Create Account"
              variant="primary"
              size="large"
              fullWidth
              loading={isLoading}
              disabled={isLoading}
              onPress={handleSignup}
              style={styles.submitButton}
              accessibilityLabel="Create account"
            />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text variant="small" color={colors.textSecondary} style={styles.dividerText}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Google Sign-In */}
          <TouchableOpacity
            style={[styles.googleButton, { borderColor: colors.border }]}
            onPress={handleGoogleSignup}
            disabled={isGoogleLoading || isLoading}
            activeOpacity={0.7}
          >
            <Image 
              source={{ uri: 'https://img.icons8.com/color/48/000000/google-logo.png' }} 
              style={{ width: 24, height: 24 }} 
            />
            <Text variant="regular" weight="semiBold" color={colors.textPrimary} style={{ marginLeft: 10 }}>
              {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text variant="regular" color={colors.textSecondary}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text variant="regular" weight="semiBold" color={colors.primary}>
                Log In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed skip footer */}
      {onSkip && (
        <View style={[styles.skipFooter, { borderTopColor: colors.border }]}>
          <TouchableOpacity onPress={onSkip} activeOpacity={0.7} style={styles.skipButton}>
            <Text variant="regular" weight="semiBold" color={Colors.textSecondary} style={{ opacity: 0.7 }}>
              Continue without account
            </Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.textSecondary} style={{ marginLeft: 6, opacity: 0.7 }} />
          </TouchableOpacity>
        </View>
      )}

      {/* Email confirmation modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalIcon, { backgroundColor: Colors.success + '15' }]}>
              <Ionicons name="mail-outline" size={40} color={Colors.success} />
            </View>
            <Text variant="large" weight="bold" color={colors.textPrimary} style={styles.modalTitle}>
              Check Your Email
            </Text>
            <Text variant="regular" color={colors.textSecondary} style={styles.modalMessage}>
              We've sent a confirmation link to{'\n'}
              <Text variant="regular" weight="semiBold" color={colors.textPrimary}>{email}</Text>
              {'\n\n'}Please confirm your email to complete sign up, then come back and log in.
            </Text>
            <Button
              title="Go to Login"
              variant="primary"
              size="medium"
              fullWidth
              onPress={() => {
                setShowConfirmModal(false);
                navigation.navigate('Login');
              }}
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
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    justifyContent: 'center',
  },
  header: {
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
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '12',
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  errorBannerText: {
    flex: 1,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.medium,
    paddingVertical: 14,
    marginBottom: Spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
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
