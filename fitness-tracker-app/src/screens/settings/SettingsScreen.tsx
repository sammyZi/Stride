/**
 * Settings Screen
 * 
 * Allows users to configure app settings including:
 * - Audio announcements
 * - Announcement intervals
 * - Unit system
 * - Haptic feedback
 */

import React from 'react';
import {
  View,
  Text as RNText,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/common';
import { Colors, Spacing } from '../../constants/theme';
import { useSettings } from '../../context';
import { useTheme } from '../../hooks';
import { UnitSystem } from '../../types';

const ANNOUNCEMENT_INTERVALS = [
  { label: '0.5 km', value: 500, imperial: 0.31 },
  { label: '1 km', value: 1000, imperial: 0.62 },
  { label: '1 mile', value: 1609, imperial: 1 },
  { label: '2 km', value: 2000, imperial: 1.24 },
];

export const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    settings,
    loading,
    toggleAudioAnnouncements,
    setAnnouncementInterval,
    setUnits,
    setMapType,
    updateSettings,
    toggleHapticFeedback,
    isHapticEnabled,
  } = useSettings();
  const { colors } = useTheme();

  const getIntervalLabel = (interval: number, units: UnitSystem): string => {
    const intervalOption = ANNOUNCEMENT_INTERVALS.find(i => i.value === interval);
    if (!intervalOption) return 'Custom';

    if (units === 'imperial') {
      return `${intervalOption.imperial} mi`;
    }
    return intervalOption.label;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text variant="large" weight="bold" color={colors.textPrimary}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Background Tracking Guide */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Help & Support</Text>
          
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('BackgroundTrackingGuide')}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="help-circle-outline" size={24} color={Colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Background Tracking Guide</Text>
                <Text style={styles.settingDescription}>
                  Prevent app from closing during workouts
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Units Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Units</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="speedometer-outline" size={24} color={Colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Unit System</Text>
                <Text style={styles.settingDescription}>
                  {settings.units === 'metric' ? 'Kilometers' : 'Miles'}
                </Text>
              </View>
            </View>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  settings.units === 'metric' && styles.segmentButtonActive,
                ]}
                onPress={() => setUnits('metric')}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    settings.units === 'metric' && styles.segmentButtonTextActive,
                  ]}
                >
                  Metric
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  settings.units === 'imperial' && styles.segmentButtonActive,
                ]}
                onPress={() => setUnits('imperial')}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    settings.units === 'imperial' && styles.segmentButtonTextActive,
                  ]}
                >
                  Imperial
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Audio Announcements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio Announcements</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="volume-high-outline" size={24} color={Colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Enable Announcements</Text>
                <Text style={styles.settingDescription}>
                  Hear distance and pace updates
                </Text>
              </View>
            </View>
            <Switch
              value={settings.audioAnnouncements}
              onValueChange={toggleAudioAnnouncements}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>

          {settings.audioAnnouncements && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="timer-outline" size={24} color={Colors.primary} />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Announcement Interval</Text>
                  <Text style={styles.settingDescription}>
                    Current: {getIntervalLabel(settings.announcementInterval, settings.units)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {settings.audioAnnouncements && (
            <View style={styles.intervalOptions}>
              {ANNOUNCEMENT_INTERVALS.map((interval) => (
                <TouchableOpacity
                  key={interval.value}
                  style={[
                    styles.intervalButton,
                    settings.announcementInterval === interval.value &&
                    styles.intervalButtonActive,
                  ]}
                  onPress={() => setAnnouncementInterval(interval.value)}
                >
                  <Text
                    style={[
                      styles.intervalButtonText,
                      settings.announcementInterval === interval.value &&
                      styles.intervalButtonTextActive,
                    ]}
                  >
                    {settings.units === 'imperial'
                      ? `${interval.imperial} mi`
                      : interval.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Auto-Pause Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Tracking</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="pause-circle-outline" size={24} color={Colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Auto-Pause</Text>
                <Text style={styles.settingDescription}>
                  Automatically pause when stationary
                </Text>
              </View>
            </View>
            <Switch
              value={settings.autoPause}
              onValueChange={(value) => updateSettings({ autoPause: value })}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>

          {settings.autoPause && (
            <>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons name="options-outline" size={24} color={Colors.primary} />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Auto-Pause Sensitivity</Text>
                    <Text style={styles.settingDescription}>
                      Current: {settings.autoPauseSensitivity.charAt(0).toUpperCase() + settings.autoPauseSensitivity.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.intervalOptions}>
                {(['low', 'medium', 'high'] as const).map((sensitivity) => (
                  <TouchableOpacity
                    key={sensitivity}
                    style={[
                      styles.intervalButton,
                      settings.autoPauseSensitivity === sensitivity &&
                      styles.intervalButtonActive,
                    ]}
                    onPress={() => updateSettings({ autoPauseSensitivity: sensitivity })}
                  >
                    <Text
                      style={[
                        styles.intervalButtonText,
                        settings.autoPauseSensitivity === sensitivity &&
                        styles.intervalButtonTextActive,
                      ]}
                    >
                      {sensitivity.charAt(0).toUpperCase() + sensitivity.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Map Display Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Map Display</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="map-outline" size={24} color={Colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Map Type</Text>
                <Text style={styles.settingDescription}>
                  Current: {settings.mapType.charAt(0).toUpperCase() + settings.mapType.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.intervalOptions}>
            {(['standard', 'satellite', 'hybrid'] as const).map((mapType) => (
              <TouchableOpacity
                key={mapType}
                style={[
                  styles.intervalButton,
                  settings.mapType === mapType && styles.intervalButtonActive,
                ]}
                onPress={() => setMapType(mapType)}
              >
                <Text
                  style={[
                    styles.intervalButtonText,
                    settings.mapType === mapType && styles.intervalButtonTextActive,
                  ]}
                >
                  {mapType.charAt(0).toUpperCase() + mapType.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Haptic Feedback Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Haptic Feedback</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="phone-portrait-outline" size={24} color={Colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Vibration Feedback</Text>
                <Text style={styles.settingDescription}>
                  Feel haptic feedback for actions
                </Text>
              </View>
            </View>
            <Switch
              value={isHapticEnabled}
              onValueChange={toggleHapticFeedback}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.infoText}>
            Audio announcements will play during your activities to keep you informed
            without looking at your phone. Haptic feedback provides tactile confirmation
            for your actions.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
  },
  header: {
    height: 60,
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: Colors.textPrimary,
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 2,
  },
  segmentButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: Colors.primary,
  },
  segmentButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: Colors.textSecondary,
  },
  segmentButtonTextActive: {
    color: '#fff',
  },
  intervalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
  },
  intervalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  intervalButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  intervalButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: Colors.textPrimary,
  },
  intervalButtonTextActive: {
    color: '#fff',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
