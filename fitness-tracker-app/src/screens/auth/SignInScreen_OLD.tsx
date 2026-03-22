import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Text, Button } from '../../components/common';
import { useTheme } from '../../hooks';
import { Spacing, BorderRadius } from '../../constants/theme';
import authService from '../../services/auth/AuthService';

WebBrowser.maybeCompleteAuthSession();

interface SignInScreenProps {
  onSignInSuccess: (isNewUser: boolean) => void;
}

/**
 * SignInScreen - Google OAuth authentication screen
 * Uses Google OAuth directly and sends token to backend
 */
export const SignInScreen: React.FC<SignInScreenProps> = ({ onSignInSuccess }) => {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);

  // Get the correct redirect URI for the current environment
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'fittracker-app',
    path: 'redirect',
  });

  // Log the redirect URI for debugging
  console.log('Redirect URI:', redirectUri);

  // Configure Google Auth - using platform-specific client IDs
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
    redirectUri,
  });

  // Handle authentication response
  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken || response.params?.id_token;
      handleGoogleSignIn(idToken);
    } else if (response?.type === 'error') {
      setLoading(false);
      console.error('Auth error:', response.error);
      Alert.alert('Sign-In Error', 'Failed to sign in with Google. Please try again.');
    } else if (response?.type === 'cancel') {
      setLoading(false);
    }
  }, [response]);

  /**
   * Handle Google Sign-In - send token to backend
   */
  const handleGoogleSignIn = async (idToken: string | undefined) => {
    if (!idToken) {
      Alert.alert('Sign-In Error', 'No authentication token received.');
      setLoading(false);
      return;
    }

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

      // Send Google token to backend for verification
      const response = await fetch(`${apiUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Backend error:', errorData);
        throw new Error(errorData.message || 'Backend authentication failed');
      }

      const data = await response.json();

      // Store user data and backend token using AuthService
      await authService.setAuthenticatedUser(data.data.user, data.data.token);

      // Call success callback
      onSignInSuccess(data.data.isNewUser || false);
    } catch (error: any) {
      console.error('Backend sign-in error:', error);
      Alert.alert(
        'Sign-In Error',
        error.message || 'Failed to authenticate with server. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Google Sign-In button press
   */
  const handleSignInPress = async () => {
    try {
      setLoading(true);
      await promptAsync();
    } catch (error) {
      console.error('Sign-in error:', error);
      setLoading(false);
      Alert.alert('Sign-In Error', 'Failed to start sign-in. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* App Logo and Branding */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
              <Ionicons name="fitness" size={64} color={colors.surface} />
            </View>

            <Text
              variant="extraLarge"
              weight="bold"
              color={colors.textPrimary}
              style={styles.title}
            >
              FitTracker
            </Text>

            <Text
              variant="medium"
              color={colors.textSecondary}
              style={styles.subtitle}
            >
              Track your fitness journey with friends
            </Text>
          </View>

          {/* Features List */}
          <View style={styles.features}>
            <FeatureItem
              icon="location"
              text="Track your runs and walks with GPS"
              colors={colors}
            />
            <FeatureItem
              icon="people"
              text="Connect with friends and share activities"
              colors={colors}
            />
            <FeatureItem
              icon="trophy"
              text="Compete in challenges and climb leaderboards"
              colors={colors}
            />
            <FeatureItem
              icon="stats-chart"
              text="View detailed statistics and personal records"
              colors={colors}
            />
          </View>

          {/* Sign-In Button */}
          <View style={styles.footer}>
            <Button
              title="Sign in with Google"
              variant="primary"
              size="large"
              fullWidth
              loading={loading}
              disabled={!request || loading}
              onPress={handleSignInPress}
              icon={
                !loading && (
                  <Ionicons name="logo-google" size={24} color={colors.surface} />
                )
              }
              iconPosition="left"
              style={styles.signInButton}
            />

            <Text
              variant="small"
              color={colors.textSecondary}
              style={styles.disclaimer}
            >
              By signing in, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/**
 * Feature item component for the features list
 */
interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  colors: any;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, text, colors }) => (
  <View style={styles.featureItem}>
    <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
      <Ionicons name={icon} size={24} color={colors.primary} />
    </View>
    <Text variant="regular" color={colors.textPrimary} style={styles.featureText}>
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
    paddingVertical: Spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.xxxl,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 280,
  },
  features: {
    marginVertical: Spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  featureText: {
    flex: 1,
  },
  footer: {
    marginTop: 'auto',
  },
  signInButton: {
    marginBottom: Spacing.lg,
  },
  disclaimer: {
    textAlign: 'center',
    lineHeight: 18,
  },
});
