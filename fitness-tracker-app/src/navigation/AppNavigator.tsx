/**
 * App Navigator
 * Main navigation structure for the app
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { 
  ActivityTrackingScreen, 
  ActivityHistoryScreen, 
  ActivityDetailScreen,
  StatsScreen,
  ProfileScreen, 
  SettingsScreen,
  BackgroundTrackingGuideScreen,
  GoalsScreen
} from '../screens';
import { Colors } from '../constants/theme';

const Tab = createBottomTabNavigator();
const HistoryStack = createStackNavigator();
const ProfileStack = createStackNavigator();
const GoalsStack = createStackNavigator();
const SettingsStack = createStackNavigator();

// History Stack Navigator
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

// Profile Stack Navigator
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

// Goals Stack Navigator
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

// Settings Stack Navigator
const SettingsStackNavigator = () => {
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
      <SettingsStack.Screen name="BackgroundTrackingGuide" component={BackgroundTrackingGuideScreen} />
    </SettingsStack.Navigator>
  );
};

const AppNavigatorComponent: React.FC = () => {
  return (
    <NavigationContainer>
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
    </NavigationContainer>
  );
};

export const AppNavigator = React.memo(AppNavigatorComponent);