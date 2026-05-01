/**
 * App Navigator
 *
 * Top-level navigation structure with conditional auth flow.
 *
 * - Unauthenticated users see the AuthStack (Signup / Login) with a
 *   "Continue without account" option for local-only mode.
 * - Authenticated users (or those who skipped) see the main Tab navigator.
 * - AccountSettings is accessible from the Settings stack.
 *
 * Requirements: 1.1, 2.1, 4.2, 6.1
 */

import React, { useState, useCallback } from 'react';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityTrackingScreen,
  ActivityHistoryScreen,
  ActivityDetailScreen,
  StatsScreen,
  ProfileScreen,
  SettingsScreen,
  BackgroundTrackingGuideScreen,
  GoalsScreen,
  SignupScreen,
  LoginScreen,
  ForgotPasswordScreen,
  AccountSettingsScreen,
} from '../screens';
import { Colors } from '../constants/theme';
import { useAuth } from '../context';

// ── Storage key for "skip auth" preference ──────────────────────────────────

const AUTH_SKIPPED_KEY = '@auth_skipped';

// ── Stack / Tab instances ───────────────────────────────────────────────────

const AuthStack = createStackNavigator();
const Tab = createBottomTabNavigator();
const HistoryStack = createStackNavigator();
const ProfileStack = createStackNavigator();
const GoalsStack = createStackNavigator();
const SettingsStack = createStackNavigator();

// ── Auth Stack Navigator (15.1) ─────────────────────────────────────────────

const AuthStackNavigator: React.FC<{
  onSkip: () => void;
}> = ({ onSkip }) => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        transitionSpec: {
          open: { animation: 'spring', config: { damping: 20, stiffness: 200, mass: 0.8 } },
          close: { animation: 'spring', config: { damping: 20, stiffness: 200, mass: 0.8 } },
        },
      }}
      initialRouteName="Login"
    >
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        initialParams={{ onSkip }}
      />
      <AuthStack.Screen
        name="Signup"
        component={SignupScreen}
        initialParams={{ onSkip }}
      />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
      />
    </AuthStack.Navigator>
  );
};

// ── History Stack Navigator ─────────────────────────────────────────────────

const HistoryStackNavigator = () => {
  return (
    <HistoryStack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <HistoryStack.Screen
        name="ActivityHistory"
        component={ActivityHistoryScreen}
      />
      <HistoryStack.Screen
        name="ActivityDetail"
        component={ActivityDetailScreen}
      />
    </HistoryStack.Navigator>
  );
};

// ── Profile Stack Navigator ─────────────────────────────────────────────────

const ProfileStackNavigator = () => {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
      />
      <ProfileStack.Screen
        name="ActivityDetail"
        component={ActivityDetailScreen}
      />
    </ProfileStack.Navigator>
  );
};

// ── Goals Stack Navigator ───────────────────────────────────────────────────

const GoalsStackNavigator = () => {
  return (
    <GoalsStack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <GoalsStack.Screen name="GoalsMain" component={GoalsScreen} />
    </GoalsStack.Navigator>
  );
};

// ── Settings Stack Navigator (includes AccountSettings) ─────────────────────

const SettingsStackNavigator = () => {
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
      <SettingsStack.Screen name="BackgroundTrackingGuide" component={BackgroundTrackingGuideScreen} />
      <SettingsStack.Screen name="AccountSettings" component={AccountSettingsScreen} />
    </SettingsStack.Navigator>
  );
};

// ── Main Tab Navigator ──────────────────────────────────────────────────────

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          paddingBottom: 20,
          paddingTop: 8,
          height: 68,
        },
        tabBarLabelStyle: {
          fontFamily: 'Poppins_500Medium',
          fontSize: 12,
        },
        headerShown: false,
        lazy: true,
      }}
    >
      <Tab.Screen
        name="Activity"
        component={ActivityTrackingScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="fitness" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flag" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// ── Root Navigator (15.2 — conditional navigation) ──────────────────────────

const AppNavigatorComponent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [authSkipped, setAuthSkipped] = useState<boolean | null>(null);

  // Restore skip preference on mount
  React.useEffect(() => {
    AsyncStorage.getItem(AUTH_SKIPPED_KEY).then((v) => {
      setAuthSkipped(v === 'true');
    });

    // Listen for events to instantly un-skip auth and show login
    const sub = require('react-native').DeviceEventEmitter.addListener('RESET_AUTH_SKIPPED', () => {
      setAuthSkipped(false);
    });

    return () => sub.remove();
  }, []);

  const handleSkip = useCallback(async () => {
    await AsyncStorage.setItem(AUTH_SKIPPED_KEY, 'true');
    setAuthSkipped(true);
  }, []);

  // When user logs out, clear the skip flag so auth screens appear again
  React.useEffect(() => {
    if (!isAuthenticated && !isLoading && authSkipped === false) {
      // User explicitly logged out — stay on auth screens
    }
  }, [isAuthenticated, isLoading, authSkipped]);

  // Still loading skip pref or auth state
  if (authSkipped === null || isLoading) {
    return null; // App.tsx shows loading indicator while isLoading
  }

  // Determine whether to show auth screens or main app
  const showMainApp = isAuthenticated || authSkipped;

  return (
    <NavigationContainer>
      {showMainApp ? (
        <MainTabNavigator />
      ) : (
        <AuthStackNavigator onSkip={handleSkip} />
      )}
    </NavigationContainer>
  );
};

export const AppNavigator = React.memo(AppNavigatorComponent);