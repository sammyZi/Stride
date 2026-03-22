import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Text, Button } from '../../components/common';
import { useTheme } from '../../hooks';
import { useAuth } from '../../context';
import { Spacing, BorderRadius } from '../../constants/theme';

interface SignInScreenProps {
    onSignInSuccess: (isNewUser: boolean) => void;
}

/**
 * SignInScreen - Supabase Google Sign-In
 */
export const SignInScreen: React.FC<SignInScreenProps> = ({ onSignInSuccess }) => {
    const { colors, isDark } = useTheme();
    const { signInWithGoogle } = useAuth();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        });
    }, []);

    /**
     * Handle Google Sign-In with Supabase
     */
    const handleGoogleSignIn = async () => {
        try {
            setLoading(true);

            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

            const signInResponse = await GoogleSignin.signIn();

            if (signInResponse.type !== 'success') {
                throw new Error('Sign-in was cancelled');
            }

            const idToken = signInResponse.data.idToken;

            if (!idToken) {
                throw new Error('No ID token received from Google Sign-In');
            }

            // Sign in with Supabase using Google ID token via AuthContext
            const result = await signInWithGoogle(idToken);

            onSignInSuccess(result.isNewUser);
        } catch (error: any) {
            console.error('Sign-in error:', error);

            let errorMessage = 'Failed to sign in. Please try again.';

            if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Check your internet connection.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            Alert.alert('Sign-In Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
                            <Ionicons name="fitness" size={64} color={colors.surface} />
                        </View>

                        <Text
                            variant="extraLarge"
                            weight="bold"
                            color={colors.textPrimary}
                            style={styles.title}
                        >
                            FitTracker
                        </Text>

                        <Text
                            variant="medium"
                            color={colors.textSecondary}
                            style={styles.subtitle}
                        >
                            Track your fitness journey with friends
                        </Text>
                    </View>

                    <View style={styles.features}>
                        <FeatureItem
                            icon="location"
                            text="Track your runs and walks with GPS"
                            colors={colors}
                        />
                        <FeatureItem
                            icon="people"
                            text="Connect with friends and share activities"
                            colors={colors}
                        />
                        <FeatureItem
                            icon="trophy"
                            text="Compete in challenges and climb leaderboards"
                            colors={colors}
                        />
                        <FeatureItem
                            icon="stats-chart"
                            text="View detailed statistics and personal records"
                            colors={colors}
                        />
                    </View>

                    <View style={styles.footer}>
                        <Button
                            title="Sign in with Google"
                            variant="primary"
                            size="large"
                            fullWidth
                            loading={loading}
                            disabled={loading}
                            onPress={handleGoogleSignIn}
                            icon={
                                !loading && (
                                    <Ionicons name="logo-google" size={24} color={colors.surface} />
                                )
                            }
                            iconPosition="left"
                            style={styles.signInButton}
                        />

                        <Text
                            variant="small"
                            color={colors.textSecondary}
                            style={styles.disclaimer}
                        >
                            By signing in, you agree to our Terms of Service and Privacy Policy
                        </Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

interface FeatureItemProps {
    icon: keyof typeof Ionicons.glyphMap;
    text: string;
    colors: any;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, text, colors }) => (
    <View style={styles.featureItem}>
        <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name={icon} size={24} color={colors.primary} />
        </View>
        <Text variant="regular" color={colors.textPrimary} style={styles.featureText}>
            {text}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: Spacing.xl,
        justifyContent: 'space-between',
        paddingVertical: Spacing.xxxl,
    },
    header: {
        alignItems: 'center',
        marginTop: Spacing.xxxl,
    },
    logoContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xl,
    },
    title: {
        marginBottom: Spacing.sm,
    },
    subtitle: {
        textAlign: 'center',
        maxWidth: 280,
    },
    features: {
        marginVertical: Spacing.xl,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    featureIcon: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.medium,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    featureText: {
        flex: 1,
    },
    footer: {
        marginTop: 'auto',
    },
    signInButton: {
        marginBottom: Spacing.lg,
    },
    disclaimer: {
        textAlign: 'center',
        lineHeight: 18,
    },
});
