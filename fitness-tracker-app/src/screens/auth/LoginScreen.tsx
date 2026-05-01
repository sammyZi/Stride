/**
 * Login Screen
 *
 * Provides an email/password login form with client-side validation,
 * server-side error display, and loading indicators.
 *
 * Requirements: 2.1, 2.3
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
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

function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_REGEX.test(email.trim())) return 'Please enter a valid email address';
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) return 'Password is required';
  return undefined;
}

// ── Component ────────────────────────────────────────────────────────────────

export const LoginScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const { signIn, signInWithGoogle } = useAuth();
  const { colors } = useTheme();
  const onSkip = route?.params?.onSkip;

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validation & feedback state
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleLogin = useCallback(async () => {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);

    setEmailError(eErr);
    setPasswordError(pErr);
    setServerError(undefined);

    if (eErr || pErr) return;

    setIsLoading(true);
    try {
      const result = await signIn(email.trim(), password);
      if (!result.success) {
        setServerError(result.error?.message ?? 'Login failed. Please try again.');
      }
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [email, password, signIn]);

  const handleGoogleLogin = useCallback(async () => {
    setIsGoogleLoading(true);
    setServerError(undefined);
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        setServerError(result.error?.message ?? 'Google login failed. Please try again.');
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="log-in" size={40} color={colors.primary} />
            </View>
            <Text variant="large" weight="bold" color={colors.textPrimary} style={styles.title}>
              Welcome Back
            </Text>
            <Text variant="regular" color={colors.textSecondary} style={styles.subtitle}>
              Log in to sync your fitness data across devices
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
              accessibilityHint="Enter your email address to log in"
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (passwordError) setPasswordError(validatePassword(t));
              }}
              error={passwordError}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              textContentType="password"
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
              accessibilityHint="Enter your password to log in"
            />

            <Button
              title="Log In"
              variant="primary"
              size="large"
              fullWidth
              loading={isLoading}
              disabled={isLoading}
              onPress={handleLogin}
              style={styles.submitButton}
              accessibilityLabel="Log in"
            />

            {/* Forgot password */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotButton}
            >
              <Text variant="small" weight="semiBold" color={colors.primary}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
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
            onPress={handleGoogleLogin}
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
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text variant="regular" weight="semiBold" color={colors.primary}>
                Sign Up
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
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
  // Fixed skip footer
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
});
