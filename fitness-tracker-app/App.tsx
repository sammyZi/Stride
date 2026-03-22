import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native';
import { useFonts, useTheme, usePermissions } from './src/hooks';
import { Text } from './src/components';
import { AppNavigator } from './src/navigation';
import { SettingsProvider } from './src/context';
import { PermissionsScreen } from './src/screens/onboarding/PermissionsScreen';
import { SignInScreen } from './src/screens';
import { authService } from './src/services';
import storageService from './src/services/storage/StorageService';
import { configurePerformance } from './src/utils/performance';

// Initialize performance optimizations for 120 FPS
configurePerformance();


function AppContent() {
  const { fontsLoaded, error } = useFonts();
  const { colors, isDark } = useTheme();
  const {
    hasRequestedPermissions,
    hasLocationPermission,
    loading: permissionsLoading,
    markPermissionsRequested,
  } = usePermissions();

  const [showPermissions, setShowPermissions] = useState(false);
  const [storageInitialized, setStorageInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Initialize storage on app launch
  React.useEffect(() => {
    const initStorage = async () => {
      try {
        await storageService.initialize();
        setStorageInitialized(true);
      } catch (error) {
        console.error('Failed to initialize storage:', error);
        setStorageInitialized(true); // Continue anyway
      }
    };
    initStorage();
  }, []);

  // Check authentication status
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        setIsAuthenticated(!!user);
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false);
      }
    };

    if (storageInitialized) {
      checkAuth();
    }

    // Listen to auth state changes
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
    });

    return () => unsubscribe();
  }, [storageInitialized]);

  React.useEffect(() => {
    if (!permissionsLoading && !hasRequestedPermissions && isAuthenticated) {
      setShowPermissions(true);
    }
  }, [permissionsLoading, hasRequestedPermissions, isAuthenticated]);

  if (!fontsLoaded || permissionsLoading || !storageInitialized || authLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
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

  // Show sign-in screen if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SignInScreen
          onSignInSuccess={(isNewUser) => {
            setIsAuthenticated(true);
            // If new user, show permissions screen
            if (isNewUser) {
              setShowPermissions(true);
            }
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
    </>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}



const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
});
