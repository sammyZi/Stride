/**
 * Background Tracking Guide Screen
 * 
 * Displays comprehensive guide for preventing the app from closing in background
 * Includes manufacturer-specific instructions and troubleshooting steps
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../../components/common';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../hooks';

interface GuideStepProps {
  number: number;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const GuideStep: React.FC<GuideStepProps> = ({ number, title, description, icon }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.stepContainer, { backgroundColor: colors.surface }]}>
      <View style={styles.stepContent}>
        <View style={styles.stepNumberContainer}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.stepNumber}
          >
            <Text style={styles.stepNumberText}>{number}</Text>
          </LinearGradient>
        </View>
        <View style={styles.stepTextContainer}>
          <View style={styles.stepTitleRow}>
            <Ionicons name={icon} size={22} color={Colors.primary} />
            <Text style={styles.stepTitle}>{title}</Text>
          </View>
          <Text style={styles.stepDescription}>{description}</Text>
        </View>
      </View>
    </View>
  );
};

interface ManufacturerGuideProps {
  manufacturer: string;
  steps: string[];
  icon: keyof typeof Ionicons.glyphMap;
}

const ManufacturerGuide: React.FC<ManufacturerGuideProps> = ({ manufacturer, steps, icon }) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = React.useState(false);
  const animatedHeight = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(animatedHeight, {
      toValue: expanded ? 1 : 0,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [expanded]);

  return (
    <View style={[styles.manufacturerContainer, { backgroundColor: colors.surface }]}>
      <TouchableOpacity
        style={styles.manufacturerHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.manufacturerIconWrapper}>
          <Ionicons name={icon} size={24} color={Colors.primary} />
        </View>
        <Text style={styles.manufacturerTitle}>{manufacturer}</Text>
        <View style={[styles.chevronContainer, expanded && styles.chevronExpanded]}>
          <Ionicons
            name="chevron-down"
            size={20}
            color={Colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.manufacturerSteps}>
          {steps.map((step, index) => (
            <View key={index} style={styles.manufacturerStep}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.manufacturerStepText}>{step}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export const BackgroundTrackingGuideScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();

  const openBatterySettings = () => {
    if (Platform.OS === 'android') {
      Linking.openSettings();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="large" weight="bold" color={colors.textPrimary}>Background Tracking</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Introduction */}
        <LinearGradient
          colors={[Colors.primary + '20', Colors.primaryLight + '10']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.heroIconContainer}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroIconGradient}
            >
              <Ionicons name="shield-checkmark" size={48} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.heroTitle}>Keep Your Workouts Running</Text>
          <Text style={styles.heroSubtitle}>
            Android's battery optimization can stop background tracking. Follow this guide to ensure uninterrupted workout tracking.
          </Text>
        </LinearGradient>

        {/* Automatic Setup */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-done-circle" size={28} color={Colors.success} />
            <Text style={styles.sectionTitle}>Automatic Setup</Text>
          </View>
          <Text style={styles.sectionDescription}>
            The app automatically handles these optimizations:
          </Text>

          <View style={styles.featuresContainer}>
            <View style={styles.featuresRow}>
              <View style={[styles.featureCard, { backgroundColor: colors.surface }]}>
                <View style={[styles.featureIconContainer, { backgroundColor: Colors.success + '15' }]}>
                  <Ionicons name="battery-charging" size={28} color={Colors.success} />
                </View>
                <Text style={styles.featureTitle} numberOfLines={2}>Battery Exemption</Text>
                <Text style={styles.featureDescription} numberOfLines={2}>Requests optimization bypass</Text>
              </View>

              <View style={[styles.featureCard, { backgroundColor: colors.surface }]}>
                <View style={[styles.featureIconContainer, { backgroundColor: Colors.info + '15' }]}>
                  <Ionicons name="notifications" size={28} color={Colors.info} />
                </View>
                <Text style={styles.featureTitle} numberOfLines={2}>Foreground Service</Text>
                <Text style={styles.featureDescription} numberOfLines={2}>Persistent notification</Text>
              </View>
            </View>

            <View style={styles.featuresRow}>
              <View style={[styles.featureCard, { backgroundColor: colors.surface }]}>
                <View style={[styles.featureIconContainer, { backgroundColor: Colors.primary + '15' }]}>
                  <Ionicons name="layers" size={28} color={Colors.primary} />
                </View>
                <Text style={styles.featureTitle} numberOfLines={2}>Background Process</Text>
                <Text style={styles.featureDescription} numberOfLines={2}>Separate tracking thread</Text>
              </View>

              <View style={styles.featureCardPlaceholder} />
            </View>
          </View>
        </View>

        {/* Manual Steps */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="construct" size={28} color={Colors.warning} />
            <Text style={styles.sectionTitle}>Manual Setup</Text>
          </View>
          <Text style={styles.sectionDescription}>
            If the app still closes in background, follow these 3 simple steps:
          </Text>

          {/* Step 1 */}
          <View style={[styles.manualStepCard, { backgroundColor: colors.surface }]}>
            <View style={styles.manualStepHeader}>
              <View style={[styles.manualStepNumber, { backgroundColor: Colors.success }]}>
                <Text style={styles.manualStepNumberText}>1</Text>
              </View>
              <View style={styles.manualStepTitleContainer}>
                <Text style={styles.manualStepTitle}>Turn Off Battery Optimization</Text>
                <Text style={styles.manualStepSubtitle}>Most important step</Text>
              </View>
            </View>
            <View style={styles.manualStepContent}>
              <View style={styles.pathStep}>
                <Ionicons name="settings-outline" size={18} color={Colors.primary} />
                <Text style={styles.pathText}>Open Settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} style={styles.pathArrow} />
              <View style={styles.pathStep}>
                <Ionicons name="apps-outline" size={18} color={Colors.primary} />
                <Text style={styles.pathText}>Apps</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} style={styles.pathArrow} />
              <View style={styles.pathStep}>
                <Ionicons name="fitness-outline" size={18} color={Colors.primary} />
                <Text style={styles.pathText}>Stride</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} style={styles.pathArrow} />
              <View style={styles.pathStep}>
                <Ionicons name="battery-charging-outline" size={18} color={Colors.primary} />
                <Text style={styles.pathText}>Battery</Text>
              </View>
            </View>
            <View style={[styles.actionBox, { backgroundColor: Colors.success + '10', borderColor: Colors.success }]}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.actionText}>Select "Don't optimize" or "Unrestricted"</Text>
            </View>
          </View>

          {/* Step 2 */}
          <View style={[styles.manualStepCard, { backgroundColor: colors.surface }]}>
            <View style={styles.manualStepHeader}>
              <View style={[styles.manualStepNumber, { backgroundColor: Colors.info }]}>
                <Text style={styles.manualStepNumberText}>2</Text>
              </View>
              <View style={styles.manualStepTitleContainer}>
                <Text style={styles.manualStepTitle}>Allow Background Activity</Text>
                <Text style={styles.manualStepSubtitle}>Keep app running</Text>
              </View>
            </View>
            <View style={styles.manualStepContent}>
              <View style={styles.pathStep}>
                <Ionicons name="settings-outline" size={18} color={Colors.primary} />
                <Text style={styles.pathText}>Settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} style={styles.pathArrow} />
              <View style={styles.pathStep}>
                <Ionicons name="apps-outline" size={18} color={Colors.primary} />
                <Text style={styles.pathText}>Apps</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} style={styles.pathArrow} />
              <View style={styles.pathStep}>
                <Ionicons name="fitness-outline" size={18} color={Colors.primary} />
                <Text style={styles.pathText}>Stride</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} style={styles.pathArrow} />
              <View style={styles.pathStep}>
                <Ionicons name="battery-charging-outline" size={18} color={Colors.primary} />
                <Text style={styles.pathText}>Battery</Text>
              </View>
            </View>
            <View style={[styles.actionBox, { backgroundColor: Colors.info + '10', borderColor: Colors.info }]}>
              <Ionicons name="toggle" size={20} color={Colors.info} />
              <Text style={styles.actionText}>Enable "Allow background activity"</Text>
            </View>
          </View>

          {/* Step 3 */}
          <View style={[styles.manualStepCard, { backgroundColor: colors.surface }]}>
            <View style={styles.manualStepHeader}>
              <View style={[styles.manualStepNumber, { backgroundColor: Colors.primary }]}>
                <Text style={styles.manualStepNumberText}>3</Text>
              </View>
              <View style={styles.manualStepTitleContainer}>
                <Text style={styles.manualStepTitle}>Lock App in Recent Apps</Text>
                <Text style={styles.manualStepSubtitle}>Prevent auto-close</Text>
              </View>
            </View>
            <View style={styles.manualStepContent}>
              <View style={styles.pathStep}>
                <Ionicons name="square-outline" size={18} color={Colors.primary} />
                <Text style={styles.pathText}>Recent Apps Button</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} style={styles.pathArrow} />
              <View style={styles.pathStep}>
                <Ionicons name="fitness-outline" size={18} color={Colors.primary} />
                <Text style={styles.pathText}>Find App</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} style={styles.pathArrow} />
              <View style={styles.pathStep}>
                <Ionicons name="ellipsis-vertical" size={18} color={Colors.primary} />
                <Text style={styles.pathText}>Tap Icon</Text>
              </View>
            </View>
            <View style={[styles.actionBox, { backgroundColor: Colors.primary + '10', borderColor: Colors.primary }]}>
              <Ionicons name="lock-closed" size={20} color={Colors.primary} />
              <Text style={styles.actionText}>Select "Lock" or "Pin"</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={openBatterySettings}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.settingsButtonGradient}
            >
              <Ionicons name="settings-sharp" size={22} color="#fff" />
              <Text style={styles.settingsButtonText}>Open Device Settings</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Manufacturer-Specific */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="phone-portrait" size={28} color={Colors.info} />
            <Text style={styles.sectionTitle}>Device-Specific Settings</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Different manufacturers have unique battery settings. Tap your device brand below:
          </Text>

          <ManufacturerGuide
            manufacturer="Samsung"
            icon="phone-portrait"
            steps={[
              'Settings → Apps → Stride → Battery → Set to "Unrestricted"',
              'Settings → Device care → Battery → Background usage limits',
              'Remove app from "Sleeping apps" and "Deep sleeping apps"',
            ]}
          />

          <ManufacturerGuide
            manufacturer="Xiaomi / MIUI"
            icon="phone-portrait"
            steps={[
              'Settings → Apps → Manage apps → Stride',
              'Autostart: Enable',
              'Battery saver: No restrictions',
              'Settings → Battery & performance → App battery saver',
              'Find app and set to "No restrictions"',
            ]}
          />

          <ManufacturerGuide
            manufacturer="Huawei"
            icon="phone-portrait"
            steps={[
              'Settings → Apps → Apps → Stride',
              'Battery → App launch: Manual, enable all three options',
              'Settings → Battery → App launch',
              'Find app and disable "Manage automatically"',
            ]}
          />

          <ManufacturerGuide
            manufacturer="OnePlus / Oppo"
            icon="phone-portrait"
            steps={[
              'Settings → Battery → Battery optimization',
              'Find app and select "Don\'t optimize"',
              'Settings → Apps → Stride → Battery',
              'Enable "Allow background activity"',
            ]}
          />

          <ManufacturerGuide
            manufacturer="Vivo"
            icon="phone-portrait"
            steps={[
              'Settings → Battery → Background power consumption management',
              'Find app and enable "Allow high background power consumption"',
            ]}
          />
        </View>

        {/* Verification */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-done" size={28} color={Colors.success} />
            <Text style={styles.sectionTitle}>Test Your Setup</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Follow these steps to verify everything works:
          </Text>

          <View style={styles.verificationContainer}>
            {[
              { icon: 'play-circle', text: 'Start a workout', color: Colors.primary },
              { icon: 'home', text: 'Press home button (don\'t swipe away)', color: Colors.info },
              { icon: 'notifications', text: 'Check for persistent notification', color: Colors.warning },
              { icon: 'time', text: 'Wait 2-3 minutes', color: Colors.success },
              { icon: 'checkmark-circle', text: 'Return - distance should increase', color: Colors.success },
            ].map((step, index) => (
              <View key={index} style={[styles.verificationStep, { backgroundColor: colors.surface }]}>
                <View style={[styles.verificationIcon, { backgroundColor: step.color + '15' }]}>
                  <Ionicons name={step.icon as any} size={20} color={step.color} />
                </View>
                <View style={styles.verificationContent}>
                  <Text style={styles.verificationNumber}>Step {index + 1}</Text>
                  <Text style={styles.verificationText}>{step.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Troubleshooting */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-buoy" size={28} color={Colors.error} />
            <Text style={styles.sectionTitle}>Common Issues</Text>
          </View>

          {[
            {
              icon: 'close-circle',
              title: 'App closes after 5-10 minutes',
              solutions: [
                'Complete ALL manual steps above',
                'Disable Adaptive Battery in settings',
                'Ensure location is "Allow all the time"',
                'Check manufacturer-specific settings',
              ],
            },
            {
              icon: 'notifications-off',
              title: 'No notification showing',
              solutions: [
                'Enable notification permissions',
                'Notification is required for tracking',
                'Check Do Not Disturb settings',
              ],
            },
            {
              icon: 'location',
              title: 'GPS not accurate',
              solutions: [
                'Go outdoors with clear sky view',
                'Wait 30-60 seconds for GPS lock',
                'Enable "High accuracy" location mode',
                'Restart device if issues persist',
              ],
            },
          ].map((issue, index) => (
            <View key={index} style={[styles.troubleshootCard, { backgroundColor: colors.surface }]}>
              <View style={styles.troubleshootHeader}>
                <View style={[styles.troubleshootIconContainer, { backgroundColor: Colors.error + '15' }]}>
                  <Ionicons name={issue.icon as any} size={24} color={Colors.error} />
                </View>
                <Text style={styles.troubleshootTitle}>{issue.title}</Text>
              </View>
              <View style={styles.troubleshootSolutions}>
                {issue.solutions.map((solution, idx) => (
                  <View key={idx} style={styles.solutionRow}>
                    <Ionicons name="checkmark" size={16} color={Colors.success} />
                    <Text style={styles.solutionText}>{solution}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Technical Details */}
        <View style={[styles.technicalSection, { backgroundColor: colors.surface }]}>
          <Ionicons name="code-slash" size={24} color={Colors.textSecondary} />
          <Text style={styles.technicalTitle}>Technical Details</Text>
          <Text style={styles.technicalText}>
            This app uses foreground services with persistent notifications, separate background processes, battery optimization exemptions, and wake locks. These are standard practices for fitness and navigation apps that require continuous location tracking.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.small,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    padding: Spacing.xxxl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heroIconContainer: {
    marginBottom: Spacing.lg,
  },
  heroIconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.md,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: Colors.textPrimary,
    flex: 1,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  featuresContainer: {
    gap: Spacing.md,
  },
  featuresRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  featureCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.large,
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 140,
    ...Shadows.small,
  },
  featureCardPlaceholder: {
    flex: 1,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  featureTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  featureDescription: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  stepContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.large,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  stepContent: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stepNumberContainer: {
    alignItems: 'center',
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  stepNumberText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  stepTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.textPrimary,
    flex: 1,
  },
  stepDescription: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  manualStepCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.large,
    marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  manualStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  manualStepNumber: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  manualStepNumberText: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
  },
  manualStepTitleContainer: {
    flex: 1,
  },
  manualStepTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  manualStepSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
  },
  manualStepContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  pathStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.small,
  },
  pathText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: Colors.textPrimary,
  },
  pathArrow: {
    marginHorizontal: -4,
  },
  actionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    borderWidth: 1.5,
  },
  actionText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.textPrimary,
    flex: 1,
  },
  settingsButton: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.large,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  settingsButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  settingsButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  manufacturerContainer: {
    borderRadius: BorderRadius.large,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.small,
  },
  manufacturerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  manufacturerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manufacturerTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.textPrimary,
    flex: 1,
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  manufacturerSteps: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  manufacturerStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#fff',
  },
  manufacturerStepText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  verificationContainer: {
    gap: Spacing.md,
  },
  verificationStep: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.large,
    gap: Spacing.md,
    ...Shadows.small,
  },
  verificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verificationContent: {
    flex: 1,
  },
  verificationNumber: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  verificationText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  troubleshootCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.large,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  troubleshootHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  troubleshootIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  troubleshootTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.textPrimary,
    flex: 1,
  },
  troubleshootSolutions: {
    gap: Spacing.sm,
  },
  solutionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  solutionText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  technicalSection: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.large,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  technicalTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  technicalText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSpacer: {
    height: Spacing.xxxl,
  },
});
