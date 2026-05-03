/**
 * Background Tracking Guide Screen
 *
 * Polished flat UI — refined typography, clear visual hierarchy,
 * no shadows, no heavy cards. Structure via spacing + subtle tints.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/common';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { useTheme } from '../../hooks';

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader
// ─────────────────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  label: string;
  description?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ label, description }) => {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 11,
          fontFamily: Typography.fontFamily.semiBold,
          letterSpacing: 0.9,
          textTransform: 'uppercase',
          color: colors.textSecondary,
          marginBottom: description ? 4 : 0,
        }}
      >
        {label}
      </Text>
      {description ? (
        <Text
          style={{
            fontSize: 13,
            fontFamily: Typography.fontFamily.regular,
            color: colors.textSecondary,
            lineHeight: 20,
          }}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ManufacturerGuide — accordion
// ─────────────────────────────────────────────────────────────────────────────

interface ManufacturerGuideProps {
  manufacturer: string;
  steps: string[];
  isLast?: boolean;
}

const ManufacturerGuide: React.FC<ManufacturerGuideProps> = ({ manufacturer, steps, isLast }) => {
  const { colors } = useTheme();
  const [open, setOpen] = React.useState(false);

  return (
    <View
      style={{
        borderBottomWidth: isLast ? 0 : 0.5,
        borderBottomColor: colors.border,
      }}
    >
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 14,
          paddingHorizontal: 16,
        }}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.6}
      >
        <Text
          style={{
            fontSize: 14,
            fontFamily: Typography.fontFamily.semiBold,
            color: colors.textPrimary,
          }}
        >
          {manufacturer}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={15}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {open && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 10 }}>
          {steps.map((step, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: colors.primary + '20',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 1,
                  flexShrink: 0,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: Typography.fontFamily.semiBold,
                    color: colors.primary,
                  }}
                >
                  {i + 1}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: Typography.fontFamily.regular,
                  color: colors.textSecondary,
                  lineHeight: 19,
                  flex: 1,
                }}
              >
                {step}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export const BackgroundTrackingGuideScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const S = React.useMemo(() => createStyles(colors), [colors]);

  const openSettings = () => {
    if (Platform.OS === 'android') Linking.openSettings();
  };

  // ── data ──────────────────────────────────────────────────────────────────

  const autoFeatures: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    sub: string;
    color: string;
  }[] = [
      { icon: 'battery-charging-outline', label: 'Battery exemption', sub: 'Bypasses optimization', color: colors.success },
      { icon: 'notifications-outline', label: 'Foreground service', sub: 'Persistent notification keeps app alive', color: colors.info },
      { icon: 'layers-outline', label: 'Background process', sub: 'Separate tracking thread', color: colors.primary },
      { icon: 'location-outline', label: 'Location lock', sub: 'Always-on GPS access', color: colors.warning },
    ];

  const manualSteps: {
    title: string;
    hint: string;
    color: string;
    path: string[];
    action: string;
    actionIcon: keyof typeof Ionicons.glyphMap;
  }[] = [
      {
        title: 'Turn off battery optimization',
        hint: 'Most important',
        color: colors.success,
        path: ['Settings', 'Apps', 'Stride', 'Battery'],
        action: 'Select "Don\'t optimize" or "Unrestricted"',
        actionIcon: 'checkmark-circle-outline',
      },
      {
        title: 'Allow background activity',
        hint: 'Screen-off tracking',
        color: colors.info,
        path: ['Settings', 'Apps', 'Stride', 'Battery'],
        action: 'Enable "Allow background activity"',
        actionIcon: 'toggle-outline',
      },
      {
        title: 'Lock app in Recent Apps',
        hint: 'Prevent auto-close',
        color: colors.primary,
        path: ['Recent Apps', 'Find Stride', 'Tap icon'],
        action: 'Select "Lock" or "Pin"',
        actionIcon: 'lock-closed-outline',
      },
    ];

  const manufacturers = [
    {
      name: 'Samsung',
      steps: [
        'Settings → Apps → Stride → Battery → Set to "Unrestricted"',
        'Settings → Device care → Battery → Background usage limits',
        'Remove from "Sleeping apps" and "Deep sleeping apps"',
      ],
    },
    {
      name: 'Xiaomi / MIUI',
      steps: [
        'Settings → Apps → Manage apps → Stride',
        'Autostart: Enable',
        'Battery saver: No restrictions',
        'Settings → Battery & performance → App battery saver → No restrictions',
      ],
    },
    {
      name: 'Huawei',
      steps: [
        'Settings → Apps → Apps → Stride',
        'Battery → App launch: Manual — enable all three options',
        'Settings → Battery → App launch → Disable "Manage automatically"',
      ],
    },
    {
      name: 'OnePlus / Oppo',
      steps: [
        'Settings → Battery → Battery optimization → Stride → Don\'t optimize',
        'Settings → Apps → Stride → Battery → Enable "Allow background activity"',
      ],
    },
    {
      name: 'Vivo',
      steps: [
        'Settings → Battery → Background power consumption management',
        'Find app → Enable "Allow high background power consumption"',
      ],
    },
  ];

  const verifySteps: {
    icon: keyof typeof Ionicons.glyphMap;
    text: string;
    color: string;
  }[] = [
      { icon: 'play-circle-outline', text: 'Start a workout', color: colors.primary },
      { icon: 'home-outline', text: 'Press home — don\'t swipe the app away', color: colors.textSecondary },
      { icon: 'notifications-outline', text: 'Check for the persistent notification', color: colors.warning },
      { icon: 'time-outline', text: 'Wait 2–3 minutes', color: colors.textSecondary },
      { icon: 'checkmark-circle-outline', text: 'Return — distance should have increased', color: colors.success },
    ];

  const issues: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    solutions: string[];
  }[] = [
      {
        icon: 'close-circle-outline',
        title: 'App closes after 5–10 minutes',
        solutions: [
          'Complete all manual steps above',
          'Disable Adaptive Battery in settings',
          'Ensure location is set to "Allow all the time"',
          'Check manufacturer-specific settings',
        ],
      },
      {
        icon: 'notifications-off-outline',
        title: 'No notification showing',
        solutions: [
          'Enable notification permissions for Stride',
          'The notification is required for tracking',
          'Check Do Not Disturb settings',
        ],
      },
      {
        icon: 'location-outline',
        title: 'GPS not accurate',
        solutions: [
          'Go outdoors with a clear sky view',
          'Wait 30–60 seconds for GPS lock',
          'Enable "High accuracy" location mode',
          'Restart device if issues persist',
        ],
      },
    ];

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[S.container, { backgroundColor: colors.background }]} edges={['top']}>

      {/* Header */}
      <View style={[S.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={S.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[S.headerTitle, { color: colors.textPrimary }]}>Background Tracking</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={S.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >

        {/* ── Hero ── */}
        <View style={[S.hero, { borderBottomColor: colors.border }]}>
          <View style={[S.heroIconWrap, { backgroundColor: colors.primary + '12' }]}>
            <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary} />
          </View>
          <View style={S.heroText}>
            <Text style={[S.heroTitle, { color: colors.textPrimary }]}>
              Keep your workouts running
            </Text>
            <Text style={[S.heroSub, { color: colors.textSecondary }]}>
              Android's battery optimization can stop background tracking. Follow this guide to ensure uninterrupted sessions.
            </Text>
          </View>
        </View>

        {/* ── Automatic setup ── */}
        <View style={[S.section, { borderBottomColor: colors.border }]}>
          <SectionHeader
            label="Automatic setup"
            description="The app handles these automatically when you start a workout."
          />
          {autoFeatures.map((f, i) => (
            <View
              key={i}
              style={[S.featureRow, i < autoFeatures.length - 1 && { marginBottom: 14 }]}
            >
              <View style={[S.featureIconBox, { backgroundColor: f.color + '12' }]}>
                <Ionicons name={f.icon} size={20} color={f.color} />
              </View>
              <View style={S.featureTexts}>
                <Text style={[S.featureName, { color: colors.textPrimary }]}>{f.label}</Text>
                <Text style={[S.featureSub, { color: colors.textSecondary }]}>{f.sub}</Text>
              </View>
              <Ionicons name="checkmark" size={16} color={colors.success} />
            </View>
          ))}
        </View>

        {/* ── Manual setup ── */}
        <View style={[S.section, { borderBottomColor: colors.border }]}>
          <SectionHeader
            label="Manual setup"
            description="If the app still closes in the background, complete these 3 steps."
          />

          {manualSteps.map((step, i) => (
            <View
              key={i}
              style={[S.manualWrap, i < manualSteps.length - 1 && { marginBottom: 28 }]}
            >
              {/* Left — number + connecting line */}
              <View style={S.manualLeft}>
                <View style={[S.numBadge, { backgroundColor: step.color }]}>
                  <Text style={S.numText}>{i + 1}</Text>
                </View>
                {i < manualSteps.length - 1 && (
                  <View style={[S.timeline, { backgroundColor: colors.border }]} />
                )}
              </View>

              {/* Right — content */}
              <View style={S.manualRight}>
                {/* Title + hint pill */}
                <View style={S.manualTitleRow}>
                  <Text style={[S.manualTitle, { color: colors.textPrimary }]}>
                    {step.title}
                  </Text>
                  <View style={[S.hintPill, { backgroundColor: step.color + '15' }]}>
                    <Text style={[S.hintText, { color: step.color }]}>{step.hint}</Text>
                  </View>
                </View>

                {/* Breadcrumb path */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 10 }}
                  contentContainerStyle={S.pathContent}
                >
                  {step.path.map((p, pi) => (
                    <React.Fragment key={pi}>
                      <View style={[S.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[S.chipText, { color: colors.textPrimary }]}>{p}</Text>
                      </View>
                      {pi < step.path.length - 1 && (
                        <Ionicons
                          name="chevron-forward"
                          size={11}
                          color={colors.textSecondary}
                          style={{ marginHorizontal: 1 }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </ScrollView>

                {/* Action highlight */}
                <View
                  style={[
                    S.actionBox,
                    { backgroundColor: step.color + '0C', borderColor: step.color + '35' },
                  ]}
                >
                  <Ionicons name={step.actionIcon} size={15} color={step.color} />
                  <Text style={[S.actionText, { color: colors.textPrimary }]}>{step.action}</Text>
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[S.settingsBtn, { backgroundColor: colors.primary }]}
            onPress={openSettings}
            activeOpacity={0.85}
          >
            <Ionicons name="settings-outline" size={17} color="#fff" />
            <Text style={S.settingsBtnText}>Open device settings</Text>
            <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.65)" />
          </TouchableOpacity>
        </View>

        {/* ── Device-specific ── */}
        <View style={[S.section, { borderBottomColor: colors.border }]}>
          <SectionHeader
            label="Device-specific settings"
            description="Tap your device brand for tailored instructions."
          />
          <View style={[S.accContainer, { borderColor: colors.border }]}>
            {manufacturers.map((m, i) => (
              <ManufacturerGuide
                key={i}
                manufacturer={m.name}
                steps={m.steps}
                isLast={i === manufacturers.length - 1}
              />
            ))}
          </View>
        </View>

        {/* ── Test setup ── */}
        <View style={[S.section, { borderBottomColor: colors.border }]}>
          <SectionHeader
            label="Test your setup"
            description="Confirm tracking works after completing the steps above."
          />
          {verifySteps.map((v, i) => (
            <View
              key={i}
              style={[S.verifyRow, i < verifySteps.length - 1 && { marginBottom: 14 }]}
            >
              <Text style={[S.verifyIdx, { color: colors.textSecondary }]}>{i + 1}</Text>
              <Ionicons name={v.icon} size={18} color={v.color} style={{ width: 24 }} />
              <Text style={[S.verifyText, { color: colors.textPrimary }]}>{v.text}</Text>
            </View>
          ))}
        </View>

        {/* ── Common issues ── */}
        <View style={[S.section, { borderBottomColor: colors.border }]}>
          <SectionHeader label="Common issues" />
          {issues.map((issue, i) => (
            <View key={i} style={[i < issues.length - 1 && { marginBottom: 22 }]}>
              <View style={S.issueHead}>
                <Ionicons name={issue.icon} size={17} color={colors.error} />
                <Text style={[S.issueTitle, { color: colors.textPrimary }]}>{issue.title}</Text>
              </View>
              {issue.solutions.map((sol, si) => (
                <View key={si} style={S.solRow}>
                  <View style={[S.solDot, { backgroundColor: colors.success }]} />
                  <Text style={[S.solText, { color: colors.textSecondary }]}>{sol}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* ── Technical note ── */}
        <View style={S.section}>
          <SectionHeader label="Technical details" />
          <Text style={[S.techText, { color: colors.textSecondary }]}>
            This app uses foreground services with persistent notifications, separate background processes, battery optimization exemptions, and wake locks — standard practices for fitness and navigation apps that require continuous location tracking.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const createStyles = (colors: typeof Colors) =>
  StyleSheet.create({
    container: { flex: 1 },

    // header
    header: {
      height: 54,
      paddingHorizontal: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 0.5,
    },
    backBtn: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 16,
      fontFamily: Typography.fontFamily.semiBold,
    },

    scroll: { flex: 1 },

    // hero — horizontal compact layout
    hero: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      paddingHorizontal: Spacing.lg,
      paddingVertical: 20,
      borderBottomWidth: 0.5,
    },
    heroIconWrap: {
      width: 50,
      height: 50,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 2,
    },
    heroText: { flex: 1 },
    heroTitle: {
      fontSize: 16,
      fontFamily: Typography.fontFamily.bold,
      lineHeight: 22,
      marginBottom: 5,
    },
    heroSub: {
      fontSize: 13,
      fontFamily: Typography.fontFamily.regular,
      lineHeight: 19,
    },

    // shared section wrapper
    section: {
      paddingHorizontal: Spacing.lg,
      paddingTop: 22,
      paddingBottom: 22,
      borderBottomWidth: 0.5,
    },

    // auto features
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
    },
    featureIconBox: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    featureTexts: { flex: 1 },
    featureName: {
      fontSize: 14,
      fontFamily: Typography.fontFamily.semiBold,
      marginBottom: 2,
    },
    featureSub: {
      fontSize: 12,
      fontFamily: Typography.fontFamily.regular,
      lineHeight: 17,
    },

    // manual steps
    manualWrap: { flexDirection: 'row', gap: 14 },
    manualLeft: { width: 28, alignItems: 'center' },
    numBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numText: {
      fontSize: 13,
      fontFamily: Typography.fontFamily.bold,
      color: '#fff',
    },
    timeline: {
      width: 1.5,
      flex: 1,
      marginTop: 5,
      marginBottom: -10,
    },
    manualRight: { flex: 1 },
    manualTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
      paddingTop: 3,
    },
    manualTitle: {
      fontSize: 14,
      fontFamily: Typography.fontFamily.semiBold,
    },
    hintPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
    },
    hintText: {
      fontSize: 11,
      fontFamily: Typography.fontFamily.semiBold,
    },

    // breadcrumb chips
    pathContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 2,
    },
    chip: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 0.5,
    },
    chipText: {
      fontSize: 12,
      fontFamily: Typography.fontFamily.medium,
    },

    // action box
    actionBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: BorderRadius.medium,
      borderWidth: 1,
    },
    actionText: {
      fontSize: 13,
      fontFamily: Typography.fontFamily.semiBold,
      flex: 1,
    },

    // open settings CTA
    settingsBtn: {
      marginTop: 20,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 13,
      paddingHorizontal: 18,
      borderRadius: BorderRadius.large,
      gap: 8,
    },
    settingsBtnText: {
      fontSize: 14,
      fontFamily: Typography.fontFamily.semiBold,
      color: '#fff',
      flex: 1,
    },

    // accordion list
    accContainer: {
      borderWidth: 0.5,
      borderRadius: BorderRadius.large,
      overflow: 'hidden',
    },

    // verify steps
    verifyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    verifyIdx: {
      width: 16,
      fontSize: 12,
      fontFamily: Typography.fontFamily.semiBold,
      textAlign: 'center',
    },
    verifyText: {
      fontSize: 14,
      fontFamily: Typography.fontFamily.regular,
      flex: 1,
      lineHeight: 20,
    },

    // common issues
    issueHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    issueTitle: {
      fontSize: 14,
      fontFamily: Typography.fontFamily.semiBold,
      flex: 1,
    },
    solRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
      marginBottom: 5,
    },
    solDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      marginTop: 7,
      flexShrink: 0,
    },
    solText: {
      fontSize: 13,
      fontFamily: Typography.fontFamily.regular,
      lineHeight: 19,
      flex: 1,
    },

    // tech note
    techText: {
      fontSize: 13,
      fontFamily: Typography.fontFamily.regular,
      lineHeight: 22,
    },
  });