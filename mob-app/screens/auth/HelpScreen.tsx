import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { AppColors } from '../../constants/theme';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

type HelpScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Help'>;

/**
 * Help Screen - How VOX Works
 * Educational content about the platform
 */
export const HelpScreen: React.FC = () => {
  const navigation = useNavigation<HelpScreenNavigationProp>();

  useEffect(() => {
    const announceScreen = async () => {
      setTimeout(async () => {
        await announceToScreenReader('How VOX works. Learn about our community platform for blind and visually impaired people.');
      }, 500);
    };

    announceScreen();
  }, []);

  const handleBack = () => {
    announceToScreenReader('Going back to welcome screen');
    setTimeout(() => {
      navigation.goBack();
    }, 300);
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
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              accessibilityHint="Return to previous screen"
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <View style={styles.logoBubble}>
              <Image
                source={require('../../assets/images/splash-icon.png')}
                style={styles.logoIcon}
                accessibilityIgnoresInvertColors
              />
            </View>
            <Text style={styles.logoText} accessibilityRole="header">
              VOX
            </Text>

            <Text style={styles.title} accessibilityRole="header">
              How VOX Works
            </Text>
          </View>

          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Our Mission
              </Text>
              <Text style={styles.paragraph} accessibilityRole="text">
                VOX is a community platform designed exclusively for blind and visually impaired people.
                We connect you through authentic community, not just technology.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Voice-First Design
              </Text>
              <Text style={styles.paragraph} accessibilityRole="text">
                Every feature in VOX works with screen readers like VoiceOver and TalkBack.
                You can use the entire app without ever looking at the screen.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                What You Can Do
              </Text>
              <Text style={styles.paragraph} accessibilityRole="text">
                • Create a profile and share your interests{'\n'}
                • Discover and connect with others in the community{'\n'}
                • Join groups based on shared hobbies and activities{'\n'}
                • Attend accessible events and gatherings{'\n'}
                • Send voice messages and make voice calls{'\n'}
                • Access verified content and resources
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Getting Started
              </Text>
              <Text style={styles.paragraph} accessibilityRole="text">
                1. Create your account with phone number or email{'\n'}
                2. Set up your profile with interests and preferences{'\n'}
                3. Explore the community and connect with others{'\n'}
                4. Join groups and attend events that interest you
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Safety and Verification
              </Text>
              <Text style={styles.paragraph} accessibilityRole="text">
                All community members go through verification to ensure safety.
                You can verify via document upload, video call, or referral from existing members.
              </Text>
            </View>
          </View>
        </ScrollView>
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
    paddingTop: 24,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: AppColors.primary,
    fontWeight: '600',
  },
  logoBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
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
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.text,
    textAlign: 'center',
  },
  content: {
    gap: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.primaryDark,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.textSecondary,
  },
});
