import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppColors } from '../../constants/theme';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { AccessibleModal } from '../../components/accessible/AccessibleModal';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { useAppSelector, useAppDispatch } from '../../hooks';
import { clearError } from '../../store/slices/authSlice';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

const { width, height } = Dimensions.get('window');
const VOICE_GUIDANCE_KEY = 'voiceGuidanceEnabled';

/**
 * Welcome Screen - First screen users see
 * If user is already logged in, redirect to Profile.
 * If session expired (invalid/expired token), redirect to Login.
 * Voice-first design with optional audio onboarding
 */
export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { isAuthenticated, errorCode, error } = useAppSelector((state) => state.auth);
  const [showVoiceOnboarding, setShowVoiceOnboarding] = useState(false);

  // If user is logged in, redirect to Main (Profile tab)
  useEffect(() => {
    if (!isAuthenticated) return;
    const root = navigation.getParent();
    if (root) {
      (root as any).navigate('Main', { initialTab: 'Profile' });
    }
  }, [isAuthenticated, navigation]);

  // If session expired or invalid token, go to Login (don't stay on Welcome)
  useEffect(() => {
    if (isAuthenticated) return;
    const sessionExpired =
      errorCode === 'UNAUTHORIZED' ||
      (typeof error === 'string' && (error.includes('refresh') || error.includes('expired') || error.includes('token')));
    if (sessionExpired) {
      dispatch(clearError());
      navigation.replace('Login');
    }
  }, [isAuthenticated, errorCode, error, dispatch, navigation]);

  // Announce screen on load - CRITICAL for accessibility
  useEffect(() => {
    const announceScreen = async () => {
      // Give screen time to render
      setTimeout(async () => {
        await announceToScreenReader(
          'Welcome to VOX. A community platform designed exclusively for blind and visually impaired people. Connecting you through community, not technology.'
        );
      }, 500);
    };

    announceScreen();
  }, []);

  useEffect(() => {
    const ensureVoiceGuidanceEnabled = async () => {
      try {
        const currentValue = await AsyncStorage.getItem(VOICE_GUIDANCE_KEY);
        if (currentValue !== 'true') {
          await AsyncStorage.setItem(VOICE_GUIDANCE_KEY, 'true');
          announceToScreenReader('Voice guidance enabled');
        }
      } catch (error) {
        console.warn('[VoiceGuidance] Failed to persist setting:', error);
      }
    };

    ensureVoiceGuidanceEnabled();
  }, []);

  const handleLogin = () => {
    announceToScreenReader('Navigating to login screen');
    setTimeout(() => {
      navigation.navigate('Login');
    }, 300);
  };

  const handleRegister = () => {
    announceToScreenReader('Navigating to create account screen');
    setTimeout(() => {
      navigation.navigate('Register');
    }, 300);
  };

  const handleHelp = () => {
    announceToScreenReader('Navigating to help screen');
    setTimeout(() => {
      navigation.navigate('Help');
    }, 300);
  };

  const handleVoiceOnboarding = () => {
    setShowVoiceOnboarding(true);
  };

  const closeVoiceOnboarding = () => {
    setShowVoiceOnboarding(false);
  };

  const enableVoiceGuidance = async () => {
    try {
      await AsyncStorage.setItem(VOICE_GUIDANCE_KEY, 'true');
      announceToScreenReader('Voice guidance enabled');
    } catch (error) {
      console.warn('[VoiceGuidance] Failed to persist setting:', error);
    } finally {
      closeVoiceOnboarding();
    }
  };

  return (
    <LinearGradient
      colors={[...AppColors.gradientAuth]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.logoBubble}>
              <Image
                source={require('../../assets/images/icon.png')}
                style={styles.logoIcon}
                accessibilityIgnoresInvertColors
              />
            </View>
            <Text
              style={styles.title}
              accessibilityRole="header"
              accessibilityLabel="VOX - Community for Blind and Visually Impaired People"
            >
              VOX
            </Text>
            <Text style={styles.subtitle} accessibilityRole="text">
              Swipe. Chat. Connect.
            </Text>
            <Text style={styles.tagline} accessibilityRole="text">
              A safe community built for blind and visually impaired people.
            </Text>
          </View>

          <View style={styles.actionsContainer}>
            <AccessibleButton
              title="Create account"
              onPress={handleRegister}
              variant="primary"
              size="large"
              accessibilityHint="Create a new VOX account to join the community"
              style={styles.primaryButton}
              textStyle={styles.primaryButtonText}
            />

            <AccessibleButton
              title="Log in"
              onPress={handleLogin}
              variant="secondary"
              size="large"
              accessibilityHint="Sign in to your existing VOX account"
              style={styles.secondaryButton}
              textStyle={styles.secondaryButtonText}
            />

            <AccessibleButton
              title="How VOX works"
              onPress={handleHelp}
              variant="outline"
              size="medium"
              accessibilityHint="Learn more about how VOX works and what to expect"
              style={styles.helpButton}
              textStyle={styles.helpButtonText}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText} accessibilityRole="text">
              VOX is designed with accessibility first.{'\n'}
            </Text>
          </View>
        </ScrollView>

        <AccessibleModal
          visible={showVoiceOnboarding}
          title="Voice Guidance"
          onClose={closeVoiceOnboarding}
          closeButtonLabel="Close voice guidance"
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalText} accessibilityRole="text">
              Voice guidance provides audio explanations and prompts throughout the app.
              {'\n\n'}
              This includes:
              {'\n'}• Screen announcements when navigating
              {'\n'}• Button action confirmations
              {'\n'}• Form validation feedback
              {'\n'}• Error announcements
              {'\n'}• Success confirmations
            </Text>

            <View style={styles.modalActions}>
              <AccessibleButton
                title="Enable Voice Guidance"
                onPress={enableVoiceGuidance}
                variant="primary"
                style={styles.modalButton}
                textStyle={styles.modalButtonText}
              />

              <AccessibleButton
                title="Maybe Later"
                onPress={closeVoiceOnboarding}
                variant="outline"
                style={styles.modalButton}
                textStyle={styles.modalButtonOutlineText}
              />
            </View>
          </View>
        </AccessibleModal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: height * 0.06,
    paddingBottom: 36,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: AppColors.primaryDark,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  logoIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: AppColors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.primaryDark,
    textAlign: 'center',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  mockWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  phoneMock: {
    width: width * 0.6,
    maxWidth: 260,
    aspectRatio: 0.52,
    borderRadius: 28,
    backgroundColor: AppColors.background,
    padding: 14,
    shadowColor: AppColors.primaryDark,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  phoneNotch: {
    width: 64,
    height: 8,
    borderRadius: 6,
    backgroundColor: AppColors.borderLight,
    alignSelf: 'center',
    marginBottom: 10,
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: AppColors.inputBg,
    borderRadius: 18,
    padding: 12,
    justifyContent: 'space-between',
  },
  mockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mockAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AppColors.borderLight,
  },
  mockPill: {
    width: 72,
    height: 12,
    borderRadius: 6,
    backgroundColor: AppColors.border,
  },
  mockCard: {
    height: 80,
    borderRadius: 16,
    backgroundColor: AppColors.primary,
    opacity: 0.8,
  },
  mockRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  mockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.primaryDark,
  },
  voiceOnboardingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  voiceButton: {
    marginBottom: 8,
    minWidth: 200,
    borderColor: AppColors.primary,
  },
  voiceButtonText: {
    color: AppColors.primary,
  },
  voiceDescription: {
    fontSize: 13,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  actionsContainer: {
    gap: 14,
    marginBottom: 28,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    shadowColor: AppColors.primaryDark,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  primaryButtonText: {
    color: AppColors.white,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: AppColors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  secondaryButtonText: {
    color: AppColors.primaryDark,
  },
  helpButton: {
    width: '100%',
    borderColor: AppColors.primary,
  },
  helpButtonText: {
    color: AppColors.primary,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalContent: {
    padding: 8,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: AppColors.textSecondary,
    marginBottom: 24,
  },
  modalActions: {
    gap: 12,
  },
  modalButton: {
    width: '100%',
  },
  modalButtonText: {
    color: AppColors.white,
  },
  modalButtonOutlineText: {
    color: AppColors.primary,
  },
});
