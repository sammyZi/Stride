import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Platform, Animated as RNAnimated, View, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, useTheme, usePermissions } from './src/hooks';
import { Text } from './src/components';
import { AppNavigator } from './src/navigation';
import { SettingsProvider, AuthProvider, SyncProvider, useAuth } from './src/context';
import { SyncToastOverlay } from './src/components';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { PrivacyConsentScreen } from './src/screens/onboarding/PrivacyConsentScreen';
import { PermissionsScreen } from './src/screens/onboarding/PermissionsScreen';
import storageService from './src/services/storage/StorageService';
import notificationService from './src/services/notification/NotificationService';
import BatteryOptimizationService from './src/services/battery/BatteryOptimizationService';
import { configurePerformance } from './src/utils/performance';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Initialize performance optimizations for 120 FPS
configurePerformance();

// Minimum time (ms) to show splash screen for a premium feel
const MIN_SPLASH_DURATION = 2000;

// AsyncStorage key for privacy consent
const PRIVACY_CONSENT_KEY = '@privacy_consent_accepted';

function AppContent() {
  const { fontsLoaded, error } = useFonts();
  const { colors, isDark } = useTheme();
  const {
    hasRequestedPermissions,
    hasLocationPermission,
    loading: permissionsLoading,
    markPermissionsRequested,
  } = usePermissions();
  
  const { isLoading: authLoading } = useAuth();

  const [showPrivacyConsent, setShowPrivacyConsent] = useState(false);
  const [privacyConsentChecked, setPrivacyConsentChecked] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [storageInitialized, setStorageInitialized] = useState(false);
  const [notificationsInitialized, setNotificationsInitialized] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [splashHidden, setSplashHidden] = useState(false);
  // True once the main Activity screen has fully mounted (or after a
  // safety timeout) so we don't reveal a blank frame under the splash.
  const [activityReady, setActivityReady] = useState(false);

  // ── Theme transition animation ─────────────────────────────────────────────
  const themeOverlayOpacity = useRef(new RNAnimated.Value(0)).current;
  const iconScale = useRef(new RNAnimated.Value(0)).current;
  const iconOpacity = useRef(new RNAnimated.Value(0)).current;
  const prevThemeRef = useRef(isDark);
  const [overlayColor, setOverlayColor] = useState(colors.background);
  const [themeIcon, setThemeIcon] = useState<'sunny' | 'moon'>('sunny');
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (prevThemeRef.current !== isDark) {
      const oldBg = prevThemeRef.current ? '#121212' : '#F8F9FA';
      setOverlayColor(oldBg);
      setThemeIcon(isDark ? 'moon' : 'sunny');
      setShowOverlay(true);

      // Reset
      themeOverlayOpacity.setValue(1);
      iconScale.setValue(0.5);
      iconOpacity.setValue(0);

      // Icon gently fades in + scales up
      RNAnimated.timing(iconOpacity, {
        toValue: 1, duration: 300, useNativeDriver: true,
      }).start();
      RNAnimated.spring(iconScale, {
        toValue: 1, damping: 16, stiffness: 90, mass: 1, useNativeDriver: true,
      }).start();

      // After React repaints, smoothly reveal new theme
      setTimeout(() => {
        RNAnimated.timing(themeOverlayOpacity, {
          toValue: 0, duration: 500, useNativeDriver: true,
        }).start();

        // Icon gently drifts out
        setTimeout(() => {
          RNAnimated.parallel([
            RNAnimated.timing(iconOpacity, {
              toValue: 0, duration: 350, useNativeDriver: true,
            }),
            RNAnimated.timing(iconScale, {
              toValue: 1.4, duration: 350, useNativeDriver: true,
            }),
          ]).start(() => setShowOverlay(false));
        }, 300);
      }, 400);

      prevThemeRef.current = isDark;
    }
  }, [isDark]);

  // Start minimum splash timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, MIN_SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, []);

  // Listen for the Activity screen reporting that it has fully mounted.
  // Also start a safety timeout so the splash can never get stuck if the
  // signal never arrives (e.g. onboarding flow, or an unexpected error).
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('ACTIVITY_SCREEN_READY', () => {
      setActivityReady(true);
    });
    const safety = setTimeout(() => setActivityReady(true), 8000);
    return () => {
      sub.remove();
      clearTimeout(safety);
    };
  }, []);

  // Initialize storage on app launch
  useEffect(() => {
    const initStorage = async () => {
      try {
        await storageService.initialize();
      } catch (error) {
        console.error('Failed to initialize storage:', error);
      } finally {
        setStorageInitialized(true);
      }
    };
    initStorage();
  }, []);

  // Initialize notifications
  useEffect(() => {
    const initNotifications = async () => {
      try {
        await notificationService.initialize();
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      } finally {
        setNotificationsInitialized(true);
      }
    };
    initNotifications();
  }, []);

  // Check privacy consent status and determine onboarding flow
  useEffect(() => {
    const checkPrivacyConsent = async () => {
      try {
        const accepted = await AsyncStorage.getItem(PRIVACY_CONSENT_KEY);
        if (accepted !== 'true') {
          // Privacy not yet accepted — show consent screen first
          setShowPrivacyConsent(true);
        }
      } catch (error) {
        console.error('Error checking privacy consent:', error);
      } finally {
        setPrivacyConsentChecked(true);
      }
    };
    checkPrivacyConsent();
  }, []);

  // After privacy is accepted, check if permissions need to be shown
  useEffect(() => {
    if (privacyConsentChecked && !showPrivacyConsent && !permissionsLoading && !hasRequestedPermissions) {
      setShowPermissions(true);
    }
  }, [privacyConsentChecked, showPrivacyConsent, permissionsLoading, hasRequestedPermissions]);

  // Request battery optimization exemption on app start (Android only).
  // Opens the system "Allow unrestricted battery" dialog ONLY when the
  // app is currently restricted. If already unrestricted, nothing happens.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    // Only request after the app is fully ready and onboarding is done
    if (!splashHidden || showPrivacyConsent || showPermissions) return;

    const requestBatteryExemption = async () => {
      try {
        const isOptimized = await BatteryOptimizationService.isAppBatteryOptimized();
        if (isOptimized) {
          // App is restricted — open system dialog
          await BatteryOptimizationService.openBatteryOptimizationSettings();
          // Mark as unrestricted after the user returns from the dialog
          await BatteryOptimizationService.markBatteryOptimizationDisabled();
        }
      } catch (error) {
        // Silently fail — don't block the user
        console.log('Battery optimization request skipped:', error);
      }
    };

    // Small delay so the app is fully visible first
    const timer = setTimeout(requestBatteryExemption, 1500);
    return () => clearTimeout(timer);
  }, [splashHidden, showPrivacyConsent, showPermissions]);

  // All services must be ready AND minimum time must have elapsed
  const allServicesReady = 
    (fontsLoaded || error) && 
    !permissionsLoading && 
    storageInitialized && 
    notificationsInitialized &&
    !authLoading &&
    privacyConsentChecked;

  const isAppReady = allServicesReady && minTimeElapsed;

  // If onboarding is shown, the Activity screen won't mount, so we shouldn't
  // wait for its ready signal. Otherwise, keep the splash up until the
  // Activity screen has fully mounted.
  const willShowOnboarding = showPrivacyConsent || showPermissions;
  const canHideSplash = isAppReady && (willShowOnboarding || activityReady);

  // Hide splash screen when everything is ready and the first screen is mounted
  useEffect(() => {
    if (canHideSplash && !splashHidden) {
      const hideSplash = async () => {
        await SplashScreen.hideAsync();
        setSplashHidden(true);
      };
      hideSplash();
    }
  }, [canHideSplash, splashHidden]);

  if (!isAppReady) {
    return null;
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text variant="medium" color={colors.error}>
          Error loading fonts
        </Text>
      </SafeAreaView>
    );
  }

  // Show privacy consent screen first (before permissions)
  if (showPrivacyConsent) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <PrivacyConsentScreen
          onAccept={async () => {
            try {
              await AsyncStorage.setItem(PRIVACY_CONSENT_KEY, 'true');
            } catch (e) {
              console.error('Error saving privacy consent:', e);
            }
            setShowPrivacyConsent(false);
          }}
        />
      </>
    );
  }

  // Show permissions screen if not requested yet
  if (showPermissions) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <PermissionsScreen
          onComplete={() => {
            markPermissionsRequested();
            setShowPermissions(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
      <SyncToastOverlay />
      {/* Theme transition: background crossfade + sun/moon icon */}
      {showOverlay && (
        <>
          <RNAnimated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: overlayColor,
                opacity: themeOverlayOpacity,
                zIndex: 9999,
              },
            ]}
          />
          <RNAnimated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                zIndex: 10000,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: iconOpacity,
              },
            ]}
          >
            <RNAnimated.View
              style={{
                transform: [{ scale: iconScale }],
              }}
            >
              <View style={[
                themeStyles.iconGlow,
                {
                  backgroundColor: themeIcon === 'sunny'
                    ? 'rgba(255, 184, 0, 0.15)'
                    : 'rgba(140, 120, 255, 0.15)',
                },
              ]}>
                <Ionicons
                  name={themeIcon}
                  size={80}
                  color={themeIcon === 'sunny' ? '#FFA500' : '#C4B5FD'}
                />
              </View>
            </RNAnimated.View>
          </RNAnimated.View>
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <SettingsProvider>
          <AuthProvider>
            <SyncProvider>
              <AppContent />
            </SyncProvider>
          </AuthProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const themeStyles = StyleSheet.create({
  iconGlow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
