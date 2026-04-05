/**
 * Battery Optimization Service
 * 
 * Handles battery optimization exemption requests for Android devices.
 * Checks if app has unrestricted battery access and prompts users when needed.
 * 
 * Features:
 * - Check if battery optimization is enabled
 * - Request exemption from battery restrictions
 * - Check before each tracking session
 * - Show user-friendly dialogs explaining why exemption is needed
 */

import { Platform, Alert, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BATTERY_CONFIG, STORAGE_CONFIG } from '@/config/tracking';

export interface BatteryOptimizationStatus {
  isOptimized: boolean;
  canRequestExemption: boolean;
  lastChecked: number;
}

class BatteryOptimizationService {
  private lastCheckTime: number = 0;
  private cachedStatus: boolean | null = null;

  /**
   * Check if the app is currently battery optimized (restricted)
   * Returns true if battery optimization is enabled (app is restricted)
   */
  async isAppBatteryOptimized(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false; // iOS doesn't have battery optimization settings
    }

    try {
      // Check cached status if checked recently (within 5 minutes)
      const now = Date.now();
      if (this.cachedStatus !== null && (now - this.lastCheckTime) < 5 * 60 * 1000) {
        return this.cachedStatus;
      }

      // Get stored status
      const storedStatus = await AsyncStorage.getItem(STORAGE_CONFIG.BATTERY_STATUS_KEY);
      if (storedStatus) {
        const status = JSON.parse(storedStatus);
        this.cachedStatus = status.isOptimized;
        this.lastCheckTime = status.lastChecked || 0;
        
        // If status is recent (within 1 hour), use it
        if (now - this.lastCheckTime < 60 * 60 * 1000) {
          return this.cachedStatus;
        }
      }

      // Note: We can't directly check the status without native module
      // So we assume it's optimized and let the user verify in settings
      // This is the safest approach to ensure users are prompted
      this.cachedStatus = true;
      this.lastCheckTime = now;
      
      await this.saveBatteryStatus(true);
      
      return true;
    } catch (error) {
      console.error('Error checking battery optimization:', error);
      return true; // Assume optimized to be safe
    }
  }

  /**
   * Mark battery optimization as disabled (user confirmed in settings)
   */
  async markBatteryOptimizationDisabled(): Promise<void> {
    this.cachedStatus = false;
    this.lastCheckTime = Date.now();
    await this.saveBatteryStatus(false);
  }

  /**
   * Reset battery optimization status (force recheck)
   */
  async resetBatteryStatus(): Promise<void> {
    this.cachedStatus = null;
    this.lastCheckTime = 0;
    await AsyncStorage.removeItem(STORAGE_CONFIG.BATTERY_STATUS_KEY);
  }

  /**
   * Request battery optimization exemption with user explanation
   * @param context - Context for the request ('tracking' or 'general')
   * @param forcePrompt - Force showing the prompt even if asked recently
   */
  async requestBatteryOptimizationExemption(
    context: 'tracking' | 'general' = 'tracking',
    forcePrompt: boolean = false
  ): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true; // iOS doesn't need this
    }

    // Check if battery optimization is already disabled
    const isOptimized = await this.isAppBatteryOptimized();
    if (!isOptimized && !forcePrompt) {
      return true; // Already exempted
    }

    // Check cooldown unless forced
    if (!forcePrompt) {
      const lastAsked = await this.getLastExemptionRequestTime();
      const now = Date.now();
      const hoursSinceLastRequest = (now - lastAsked) / (1000 * 60 * 60);

      // Don't ask more than once per configured cooldown period
      if (hoursSinceLastRequest < BATTERY_CONFIG.REQUEST_COOLDOWN_HOURS) {
        console.log(`Battery exemption requested ${hoursSinceLastRequest.toFixed(1)}h ago, skipping`);
        return false;
      }
    }

    const message = this.getExemptionMessage(context);

    // Save the request time
    await this.saveExemptionRequestTime();

    return new Promise((resolve) => {
      Alert.alert(
        'Battery Optimization Required',
        message,
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Open Settings',
            onPress: async () => {
              const success = await this.openBatteryOptimizationSettings();
              resolve(success);
            },
          },
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Open Android battery optimization settings
   */
  async openBatteryOptimizationSettings(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const packageName = await this.getPackageName();

      // Try to open battery optimization settings directly
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
        {
          data: `package:${packageName}`,
        }
      );

      return true;
    } catch (error) {
      console.error('Error opening battery optimization settings:', error);
      
      // Fallback: Try to open general battery settings
      try {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
        );
        return true;
      } catch (fallbackError) {
        console.error('Error opening fallback settings:', fallbackError);
        
        // Last resort: Open app settings
        await Linking.openSettings();
        return true;
      }
    }
  }

  /**
   * Check if battery optimization exemption should be requested
   * Call this before starting background tracking
   * @param respectCooldown - Whether to respect the cooldown period
   */
  async shouldRequestExemption(respectCooldown: boolean = true): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    // Check if app is battery optimized
    const isOptimized = await this.isAppBatteryOptimized();
    if (!isOptimized) {
      return false; // Already exempted
    }

    // Check cooldown if requested
    if (respectCooldown) {
      const lastAsked = await this.getLastExemptionRequestTime();
      const now = Date.now();
      const hoursSinceLastRequest = (now - lastAsked) / (1000 * 60 * 60);

      // Don't ask more than once per configured cooldown period
      if (hoursSinceLastRequest < BATTERY_CONFIG.REQUEST_COOLDOWN_HOURS) {
        return false;
      }
    }

    return true;
  }

  /**
   * Request exemption if needed before starting background operations
   * This should be called EVERY TIME before starting activity tracking
   * @param context - Context for the request
   * @param forcePrompt - Force showing the prompt even if asked recently
   */
  async ensureBatteryExemption(
    context: 'tracking' | 'general' = 'tracking',
    forcePrompt: boolean = false
  ): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true; // iOS doesn't need this
    }

    // Always check if battery optimization is enabled
    const isOptimized = await this.isAppBatteryOptimized();
    
    if (!isOptimized && !forcePrompt) {
      return true; // Already exempted
    }

    // Check if we should request (respects cooldown unless forced)
    const shouldRequest = forcePrompt || await this.shouldRequestExemption(!forcePrompt);
    
    if (!shouldRequest) {
      // Still optimized but in cooldown period
      // Show a non-intrusive warning
      console.warn('Battery optimization is enabled but in cooldown period');
      return false;
    }

    // Request exemption
    return await this.requestBatteryOptimizationExemption(context, forcePrompt);
  }

  /**
   * Check battery optimization status on app start
   * Shows a one-time prompt if battery optimization is enabled
   */
  async checkOnAppStart(): Promise<void> {
    if (!BATTERY_CONFIG.CHECK_ON_APP_START || Platform.OS !== 'android') {
      return;
    }

    const isOptimized = await this.isAppBatteryOptimized();
    if (isOptimized) {
      // Check if we should show the prompt
      const shouldRequest = await this.shouldRequestExemption(true);
      if (shouldRequest) {
        await this.requestBatteryOptimizationExemption('general', false);
      }
    }
  }

  /**
   * Check battery optimization before starting tracking
   * This is called every time user starts an activity
   */
  async checkBeforeTracking(): Promise<boolean> {
    if (!BATTERY_CONFIG.CHECK_BEFORE_TRACKING || Platform.OS !== 'android') {
      return true;
    }

    const isOptimized = await this.isAppBatteryOptimized();
    if (!isOptimized) {
      return true; // Already exempted
    }

    // Show prompt (respects cooldown)
    return await this.ensureBatteryExemption('tracking', false);
  }

  /**
   * Show informational dialog about battery optimization
   */
  showBatteryOptimizationInfo(): void {
    Alert.alert(
      'About Battery Optimization',
      'For accurate activity tracking, we recommend disabling battery optimization for this app.\n\n' +
      'Battery optimization can:\n' +
      '• Stop background location tracking\n' +
      '• Delay activity updates\n' +
      '• Reduce tracking accuracy\n\n' +
      'Disabling it ensures reliable tracking without interruptions.\n\n' +
      'Note: The app will still use battery efficiently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => this.openBatteryOptimizationSettings(),
        },
      ]
    );
  }

  /**
   * Get current battery optimization status with details
   */
  async getBatteryStatus(): Promise<BatteryOptimizationStatus> {
    const isOptimized = await this.isAppBatteryOptimized();
    const lastChecked = this.lastCheckTime;
    
    return {
      isOptimized,
      canRequestExemption: Platform.OS === 'android',
      lastChecked,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async saveBatteryStatus(isOptimized: boolean): Promise<void> {
    try {
      const status = {
        isOptimized,
        lastChecked: Date.now(),
      };
      await AsyncStorage.setItem(
        STORAGE_CONFIG.BATTERY_STATUS_KEY,
        JSON.stringify(status)
      );
    } catch (error) {
      console.error('Error saving battery status:', error);
    }
  }

  private getExemptionMessage(context: 'tracking' | 'general'): string {
    if (context === 'tracking') {
      return (
        '⚠️ Battery optimization is currently enabled for this app.\n\n' +
        'To track your activities accurately in the background, please disable battery optimization.\n\n' +
        'This ensures:\n' +
        '✓ Continuous GPS tracking\n' +
        '✓ Accurate distance and route recording\n' +
        '✓ Real-time activity updates\n\n' +
        'Your battery life will not be significantly affected.\n\n' +
        'In the next screen, select "Don\'t optimize" or "Unrestricted".'
      );
    }

    return (
      '⚠️ Battery optimization is currently enabled.\n\n' +
      'For the best experience, please disable battery optimization for this app.\n\n' +
      'This allows the app to run smoothly in the background without interruptions.\n\n' +
      'Select "Don\'t optimize" or "Unrestricted" in the next screen.'
    );
  }

  private async getPackageName(): Promise<string> {
    // Get package name from app.json
    return 'com.fittracker.app';
  }

  private async getLastExemptionRequestTime(): Promise<number> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_CONFIG.BATTERY_EXEMPTION_KEY);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      console.error('Error getting last exemption request time:', error);
      return 0;
    }
  }

  private async saveExemptionRequestTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_CONFIG.BATTERY_EXEMPTION_KEY,
        Date.now().toString()
      );
    } catch (error) {
      console.error('Error saving exemption request time:', error);
    }
  }
}

export default new BatteryOptimizationService();
