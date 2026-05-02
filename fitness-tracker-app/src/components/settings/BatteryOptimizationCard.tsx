/**
 * Battery Optimization Card Component
 * 
 * Displays battery optimization status and allows users to manage it.
 * Shows in settings screen to help users understand and control battery settings.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/common';
import { useTheme } from '@/hooks';
import BatteryOptimizationService from '@/services/battery/BatteryOptimizationService';

export const BatteryOptimizationCard: React.FC = () => {
  const { colors } = useTheme();
  const [isOptimized, setIsOptimized] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkBatteryStatus();
  }, []);

  const checkBatteryStatus = async () => {
    const optimized = await BatteryOptimizationService.isAppBatteryOptimized();
    setIsOptimized(optimized);
  };

  const handleOpenSettings = async () => {
    setLoading(true);
    try {
      await BatteryOptimizationService.openBatteryOptimizationSettings();
      // Recheck status after user returns
      setTimeout(checkBatteryStatus, 1000);
    } catch (error) {
      console.error('Error opening battery settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowInfo = () => {
    BatteryOptimizationService.showBatteryOptimizationInfo();
  };

  // Only show on Android
  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons 
            name={isOptimized ? 'battery-half' : 'battery-full'} 
            size={24} 
            color={isOptimized ? colors.warning : colors.success} 
          />
          <Text variant="medium" style={styles.title}>
            Battery Optimization
          </Text>
        </View>
        <TouchableOpacity onPress={handleShowInfo}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={[styles.statusBadge, { 
          backgroundColor: isOptimized ? `${colors.warning}20` : `${colors.success}20`
        }]}>
          <Text 
            variant="small" 
            style={{ color: isOptimized ? colors.warning : colors.success }}
          >
            {isOptimized ? 'Restricted' : 'Unrestricted'}
          </Text>
        </View>

        <Text variant="small" color={colors.textSecondary} style={styles.description}>
          {isOptimized 
            ? 'Battery optimization may affect background tracking accuracy. Tap below to disable it for better performance.'
            : 'Battery optimization is disabled. Your activities will be tracked accurately in the background.'
          }
        </Text>

        {isOptimized && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleOpenSettings}
            disabled={loading}
          >
            <Text variant="medium" style={{ color: colors.surface }}>
              {loading ? 'Opening Settings...' : 'Disable Optimization'}
            </Text>
            <Ionicons name="settings-outline" size={18} color={colors.surface} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
  },
  content: {
    gap: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  description: {
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 4,
  },
});
