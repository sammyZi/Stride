/**
 * PermissionsScreen
 * Requests all necessary permissions when app first loads
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import { Text, Button, ConfirmModal } from '../../components/common';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import BatteryOptimizationService from '../../services/battery/BatteryOptimizationService';

interface PermissionsScreenProps {
  onComplete: () => void;
}

interface PermissionStatus {
  location: 'pending' | 'granted' | 'denied';
  backgroundLocation: 'pending' | 'granted' | 'denied';
  motion: 'pending' | 'granted' | 'denied';
}

export const PermissionsScreen: React.FC<PermissionsScreenProps> = ({ onComplete }) => {
  const { modalState, showConfirm, hideModal } = useConfirmModal();
  const [permissions, setPermissions] = useState<PermissionStatus>({
    location: 'pending',
    backgroundLocation: 'pending',
    motion: 'pending',
  });
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    checkExistingPermissions();
  }, []);

  const checkExistingPermissions = async () => {
    try {
      // Check location permission
      const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
      
      // Check background location permission
      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
      
      // Check motion permission (pedometer)
      let motionStatus: 'granted' | 'denied' | 'pending' = 'pending';
      try {
        if (Platform.OS === 'android' && Platform.Version >= 29) {
          // Android 10+ requires ACTIVITY_RECOGNITION permission
          const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
          );
          motionStatus = granted ? 'granted' : 'pending';
        } else {
          // iOS or older Android - just check if pedometer is available
          const available = await Pedometer.isAvailableAsync();
          motionStatus = available ? 'granted' : 'denied';
        }
      } catch (error) {
        console.log('Error checking motion permission:', error);
        motionStatus = 'denied';
      }

      setPermissions({
        location: locationStatus === 'granted' ? 'granted' : 'pending',
        backgroundLocation: backgroundStatus === 'granted' ? 'granted' : 'pending',
        motion: motionStatus,
      });

      // If all permissions granted, auto-complete
      if (
        locationStatus === 'granted' &&
        backgroundStatus === 'granted' &&
        motionStatus === 'granted'
      ) {
        setTimeout(onComplete, 500);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const requestAllPermissions = async () => {
    setIsRequesting(true);

    try {
      // 1. Request foreground location permission
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      setPermissions(prev => ({
        ...prev,
        location: locationStatus === 'granted' ? 'granted' : 'denied',
      }));

      if (locationStatus !== 'granted') {
        showConfirm(
          'Location Permission Required',
          'Location permission is required to track your activities. Please enable it in settings.',
          [{ text: 'OK', onPress: hideModal, style: 'default' }],
          { icon: 'location', iconColor: Colors.error }
        );
        setIsRequesting(false);
        return;
      }

      // 2. Request background location permission
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      setPermissions(prev => ({
        ...prev,
        backgroundLocation: backgroundStatus === 'granted' ? 'granted' : 'denied',
      }));

      // 3. Request motion/activity recognition permission
      try {
        if (Platform.OS === 'android' && Platform.Version >= 29) {
          // Android 10+ requires ACTIVITY_RECOGNITION permission
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
            {
              title: 'Activity Recognition Permission',
              message: 'This app needs access to your physical activity to count steps.',
              buttonPositive: 'OK',
              buttonNegative: 'Cancel',
            }
          );
          
          setPermissions(prev => ({
            ...prev,
            motion: granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied',
          }));
        } else {
          // iOS or older Android - check if pedometer is available
          const available = await Pedometer.isAvailableAsync();
          setPermissions(prev => ({
            ...prev,
            motion: available ? 'granted' : 'denied',
          }));
        }
      } catch (error) {
        console.log('Motion sensor not available:', error);
        setPermissions(prev => ({
          ...prev,
          motion: 'denied',
        }));
      }

      // Check if all critical permissions granted
      if (locationStatus === 'granted') {
        // Request battery optimization exemption on Android before completing
        if (Platform.OS === 'android' && backgroundStatus === 'granted') {
          try {
            // Skip cooldown during onboarding to ensure user sees the prompt
            await BatteryOptimizationService.ensureBatteryExemption('tracking', true);
          } catch (error) {
            console.log('Battery optimization request error:', error);
          }
        }
        
        // Location is critical, others are optional
        setTimeout(onComplete, 500);
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      showConfirm(
        'Error',
        'Failed to request permissions. Please try again.',
        [{ text: 'OK', onPress: hideModal, style: 'default' }],
        { icon: 'alert-circle', iconColor: Colors.error }
      );
    } finally {
      setIsRequesting(false);
    }
  };

  const getPermissionIcon = (status: 'pending' | 'granted' | 'denied') => {
    switch (status) {
      case 'granted':
        return <Ionicons name="checkmark-circle" size={24} color={Colors.success} />;
      case 'denied':
        return <Ionicons name="close-circle" size={24} color={Colors.error} />;
      default:
        return <Ionicons name="help-circle" size={24} color={Colors.textSecondary} />;
    }
  };

  const allGranted = permissions.location === 'granted';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={64} color={Colors.primary} />
          </View>
          <Text variant="extraLarge" weight="bold" color={Colors.textPrimary} align="center">
            Welcome to Stride
          </Text>
          <Text variant="regular" color={Colors.textSecondary} align="center" style={styles.subtitle}>
            To provide accurate activity tracking, we need a few permissions. Your data stays private and secure on your device.
          </Text>
        </View>

        {/* Permissions List */}
        <View style={styles.permissionsList}>
          {/* Location Permission */}
          <View style={styles.permissionCard}>
            <View style={styles.permissionHeader}>
              <View style={styles.permissionIconContainer}>
                <Ionicons name="location" size={32} color={Colors.primary} />
              </View>
              <View style={styles.permissionInfo}>
                <Text variant="medium" weight="semiBold" color={Colors.textPrimary}>
                  Location Access
                </Text>
                <Text variant="small" color={Colors.textSecondary}>
                  Required
                </Text>
              </View>
              {getPermissionIcon(permissions.location)}
            </View>
            <Text variant="small" color={Colors.textSecondary} style={styles.permissionDescription}>
              Essential for tracking your route, distance, speed, and pace during workouts. Without this, the app cannot function.
            </Text>
          </View>

          {/* Background Location Permission */}
          <View style={styles.permissionCard}>
            <View style={styles.permissionHeader}>
              <View style={styles.permissionIconContainer}>
                <Ionicons name="navigate" size={32} color={Colors.info} />
              </View>
              <View style={styles.permissionInfo}>
                <Text variant="medium" weight="semiBold" color={Colors.textPrimary}>
                  Background Location
                </Text>
                <Text variant="small" color={Colors.textSecondary}>
                  Recommended
                </Text>
              </View>
              {getPermissionIcon(permissions.backgroundLocation)}
            </View>
            <Text variant="small" color={Colors.textSecondary} style={styles.permissionDescription}>
              Allows continuous tracking when your screen is off or you're using other apps. Highly recommended for accurate workout data.
            </Text>
          </View>

          {/* Motion Permission */}
          <View style={styles.permissionCard}>
            <View style={styles.permissionHeader}>
              <View style={styles.permissionIconContainer}>
                <Ionicons name="footsteps" size={32} color={Colors.success} />
              </View>
              <View style={styles.permissionInfo}>
                <Text variant="medium" weight="semiBold" color={Colors.textPrimary}>
                  Motion & Fitness
                </Text>
                <Text variant="small" color={Colors.textSecondary}>
                  Optional
                </Text>
              </View>
              {getPermissionIcon(permissions.motion)}
            </View>
            <Text variant="small" color={Colors.textSecondary} style={styles.permissionDescription}>
              Enables step counting and activity recognition for more detailed workout insights. Optional but enhances your experience.
            </Text>
          </View>
        </View>

        {/* Privacy & Battery Note */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="lock-closed" size={24} color={Colors.success} />
            <View style={styles.infoContent}>
              <Text variant="medium" weight="semiBold" color={Colors.textPrimary}>
                Privacy First
              </Text>
              <Text variant="small" color={Colors.textSecondary} style={styles.infoText}>
                All your data is stored locally on your device. We never collect, share, or sell your location data.
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="battery-charging" size={24} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text variant="medium" weight="semiBold" color={Colors.textPrimary}>
                Battery Optimized
              </Text>
              <Text variant="small" color={Colors.textSecondary} style={styles.infoText}>
                We use efficient GPS tracking and foreground services to minimize battery drain during workouts.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {allGranted ? (
          <Button
            title="Continue"
            variant="primary"
            onPress={onComplete}
            style={styles.button}
          />
        ) : (
          <>
            <Button
              title={isRequesting ? "Requesting..." : "Grant Permissions"}
              variant="primary"
              onPress={requestAllPermissions}
              disabled={isRequesting}
              style={styles.button}
            />
            <TouchableOpacity
              style={styles.skipButton}
              onPress={onComplete}
              disabled={isRequesting}
            >
              <Text variant="regular" color={Colors.textSecondary}>
                Skip for now
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

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
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  subtitle: {
    marginTop: Spacing.md,
    lineHeight: 24,
  },
  permissionsList: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  permissionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    ...Shadows.small,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  permissionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionDescription: {
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  infoSection: {
    gap: Spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.small,
  },
  infoContent: {
    flex: 1,
  },
  infoText: {
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  actions: {
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    marginBottom: Spacing.md,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
});
