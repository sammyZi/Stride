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
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/common';
import { SyncStatusIndicator } from '../../components/sync';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { useSettings } from '../../context';
import { useTheme } from '../../hooks';
import { UnitSystem } from '../../types';

const ANNOUNCEMENT_INTERVALS = [
  { label: '0.5 km', value: 500, imperial: 0.31 },
  { label: '1 km', value: 1000, imperial: 0.62 },
  { label: '1 mile', value: 1609, imperial: 1 },
  { label: '2 km', value: 2000, imperial: 1.24 },
];

// ── Reusable sub-components ──────────────────────────────────────────────────

interface SectionProps {
  title: string;
  children: React.ReactNode;
  colors: any;
  isFirst?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, children, colors, isFirst }) => (
  <View style={[styles.section, isFirst && { marginTop: 0 }]}>
    <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
    <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
      {children}
    </View>
  </View>
);

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  label: string;
  description: string;
  colors: any;
  right?: React.ReactNode;
  onPress?: () => void;
  isLast?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon, iconBg, label, description, colors, right, onPress, isLast,
}) => {
  const content = (
    <View style={[styles.settingRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <View style={[styles.iconCircle, { backgroundColor: iconBg + '18' }]}>  
        <Ionicons name={icon} size={20} color={iconBg} />
      </View>
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      {right}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.6} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};

// ── Pill selector ────────────────────────────────────────────────────────────

interface PillOption { label: string; value: string | number }

interface PillSelectorProps {
  options: PillOption[];
  selected: string | number;
  onSelect: (value: any) => void;
  colors: any;
}

const PillSelector: React.FC<PillSelectorProps> = ({ options, selected, onSelect, colors }) => (
  <View style={styles.pillRow}>
    {options.map((opt) => {
      const active = opt.value === selected;
      return (
        <TouchableOpacity
          key={String(opt.value)}
          style={[
            styles.pill,
            { borderColor: colors.border, backgroundColor: active ? colors.primary : colors.surface },
          ]}
          onPress={() => onSelect(opt.value)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.pillText,
              { color: active ? '#fff' : colors.textPrimary },
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ── Main screen ──────────────────────────────────────────────────────────────

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

  const switchTrackColor = { false: colors.border, true: colors.primary };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text variant="large" weight="bold" color={colors.textPrimary}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Sync Status */}
        <SyncStatusIndicator />

        {/* ── Account ──────────────────────────────────────────────────── */}
        <Section title="Account" colors={colors} isFirst>
          <SettingRow
            icon="person-circle-outline"
            iconBg={colors.primary}
            label="Account & Cloud Sync"
            description="Manage your account and data sync"
            colors={colors}
            right={<Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
            onPress={() => navigation.navigate('AccountSettings')}
            isLast
          />
        </Section>

        {/* ── Units ────────────────────────────────────────────────────── */}
        <Section title="Units" colors={colors}>
          <SettingRow
            icon="speedometer-outline"
            iconBg="#4ECDC4"
            label="Unit System"
            description={settings.units === 'metric' ? 'Kilometers' : 'Miles'}
            colors={colors}
            right={
              <View style={[styles.segmentedControl, { backgroundColor: colors.background }]}>
                {(['metric', 'imperial'] as const).map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[
                      styles.segmentButton,
                      settings.units === u && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setUnits(u)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: settings.units === u ? '#fff' : colors.textSecondary },
                      ]}
                    >
                      {u === 'metric' ? 'km' : 'mi'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
            isLast
          />
        </Section>

        {/* ── Audio Announcements ──────────────────────────────────────── */}
        <Section title="Audio Announcements" colors={colors}>
          <SettingRow
            icon="volume-high-outline"
            iconBg="#FF9F43"
            label="Enable Announcements"
            description="Hear distance and pace updates"
            colors={colors}
            right={
              <Switch
                value={settings.audioAnnouncements}
                onValueChange={toggleAudioAnnouncements}
                trackColor={switchTrackColor}
                thumbColor="#fff"
              />
            }
            isLast={!settings.audioAnnouncements}
          />

          {settings.audioAnnouncements && (
            <>
              <SettingRow
                icon="timer-outline"
                iconBg="#FF9F43"
                label="Interval"
                description={`Every ${getIntervalLabel(settings.announcementInterval, settings.units)}`}
                colors={colors}
                isLast
              />
              <PillSelector
                options={ANNOUNCEMENT_INTERVALS.map((i) => ({
                  label: settings.units === 'imperial' ? `${i.imperial} mi` : i.label,
                  value: i.value,
                }))}
                selected={settings.announcementInterval}
                onSelect={setAnnouncementInterval}
                colors={colors}
              />
            </>
          )}
        </Section>

        {/* ── Activity Tracking ────────────────────────────────────────── */}
        <Section title="Activity Tracking" colors={colors}>
          <SettingRow
            icon="pause-circle-outline"
            iconBg="#00D9A3"
            label="Auto-Pause"
            description="Automatically pause when stationary"
            colors={colors}
            right={
              <Switch
                value={settings.autoPause}
                onValueChange={(v) => updateSettings({ autoPause: v })}
                trackColor={switchTrackColor}
                thumbColor="#fff"
              />
            }
            isLast={!settings.autoPause}
          />

          {settings.autoPause && (
            <>
              <SettingRow
                icon="options-outline"
                iconBg="#00D9A3"
                label="Sensitivity"
                description={settings.autoPauseSensitivity.charAt(0).toUpperCase() + settings.autoPauseSensitivity.slice(1)}
                colors={colors}
                isLast
              />
              <PillSelector
                options={[
                  { label: 'Low', value: 'low' },
                  { label: 'Medium', value: 'medium' },
                  { label: 'High', value: 'high' },
                ]}
                selected={settings.autoPauseSensitivity}
                onSelect={(v: string) => updateSettings({ autoPauseSensitivity: v as any })}
                colors={colors}
              />
            </>
          )}
        </Section>

        {/* ── Map Display ──────────────────────────────────────────────── */}
        <Section title="Map Display" colors={colors}>
          <SettingRow
            icon="map-outline"
            iconBg="#6C63FF"
            label="Map Type"
            description={settings.mapType.charAt(0).toUpperCase() + settings.mapType.slice(1)}
            colors={colors}
            isLast
          />
          <PillSelector
            options={[
              { label: 'Standard', value: 'standard' },
              { label: 'Satellite', value: 'satellite' },
              { label: 'Hybrid', value: 'hybrid' },
            ]}
            selected={settings.mapType}
            onSelect={setMapType}
            colors={colors}
          />
        </Section>

        {/* ── Haptic Feedback ──────────────────────────────────────────── */}
        <Section title="Haptic Feedback" colors={colors}>
          <SettingRow
            icon="phone-portrait-outline"
            iconBg="#EE5A24"
            label="Vibration Feedback"
            description="Feel haptic feedback for actions"
            colors={colors}
            right={
              <Switch
                value={isHapticEnabled}
                onValueChange={toggleHapticFeedback}
                trackColor={switchTrackColor}
                thumbColor="#fff"
              />
            }
            isLast
          />
        </Section>

        {/* ── Help & Support ───────────────────────────────────────────── */}
        <Section title="Help & Support" colors={colors}>
          <SettingRow
            icon="help-circle-outline"
            iconBg="#4ECDC4"
            label="Background Tracking Guide"
            description="Prevent app from closing during workouts"
            colors={colors}
            right={<Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
            onPress={() => navigation.navigate('BackgroundTrackingGuide')}
            isLast
          />
        </Section>

        {/* ── Info footer ──────────────────────────────────────────────── */}
        <View style={styles.infoFooter}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Audio announcements play during activities so you can stay informed without checking
            your phone. Haptic feedback provides tactile confirmation for actions.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  // ── Sections ───────────────────────────────────────────────────────────
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },

  // ── Setting rows ───────────────────────────────────────────────────────
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },
  settingDescription: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginTop: 1,
  },

  // ── Segmented control (km / mi) ────────────────────────────────────────
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  segmentButton: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },

  // ── Pill selector ──────────────────────────────────────────────────────
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },

  // ── Info footer ────────────────────────────────────────────────────────
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    paddingTop: 20,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 18,
  },
});
