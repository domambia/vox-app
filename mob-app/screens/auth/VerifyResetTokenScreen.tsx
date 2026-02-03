import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { LinearGradient } from 'expo-linear-gradient';
import { AppColors } from '../../constants/theme';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { AccessibleInput } from '../../components/accessible/AccessibleInput';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { apiClient } from '../../services/api/apiClient';

type VerifyResetTokenScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'CompletePasswordReset'>;
type VerifyResetTokenScreenRouteProp = RouteProp<AuthStackParamList, 'CompletePasswordReset'>;

interface VerifyTokenFormData {
  token: string;
}

// Validation schema
const verifyTokenSchema = yup.object().shape({
  token: yup
    .string()
    .required('Reset token is required')
    .matches(/^[a-f0-9]{64}$/i, 'Please enter a valid reset token'),
});

/**
 * Verify Reset Token Screen - Enter Password Reset Code
 * Voice-first design for token verification
 */
export const VerifyResetTokenScreen: React.FC = () => {
  const navigation = useNavigation<VerifyResetTokenScreenNavigationProp>();
  const route = useRoute<VerifyResetTokenScreenRouteProp>();
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    setError,
    clearErrors,
    setValue,
  } = useForm<VerifyTokenFormData>({
    resolver: yupResolver(verifyTokenSchema),
    mode: 'onChange',
    defaultValues: {
      token: (route.params as unknown as { resetToken: string })?.resetToken || '',
    },
  });

  // Countdown for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Announce screen on load
  useEffect(() => {
    const announceScreen = async () => {
      setTimeout(async () => {
        await announceToScreenReader(
          'Verify reset token screen. Enter the reset token sent to your email or phone.'
        );
      }, 500);
    };

    announceScreen();
  }, []);

  const handleValidationError = async (fieldName: string, errorMessage: string) => {
    await announceToScreenReader(`${fieldName}: ${errorMessage}`, { isAlert: true });
  };

  const onSubmit = async (data: VerifyTokenFormData) => {
    try {
      clearErrors();
      await announceToScreenReader('Verifying token. Please wait.');

      await apiClient.post('/auth/password-reset/verify', { token: data.token });

      await announceToScreenReader('Token verified successfully.', { isAlert: true });

      // Navigate to complete reset screen
      setTimeout(() => {
        navigation.navigate('CompletePasswordReset' as keyof AuthStackParamList);
      }, 1000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid or expired reset token';
      await announceToScreenReader(`${errorMessage}. Please try again.`, { isAlert: true });
      setError('token', { message: errorMessage });
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    try {
      await announceToScreenReader('Resending reset token. Please wait.');

      if (!(route.params as unknown as { phoneNumber: string })?.phoneNumber) {
        throw new Error('Phone number is missing. Please restart password reset.');
      }

      await apiClient.post('/auth/password-reset/request', {
        phoneNumber: (route.params as unknown as { phoneNumber: string }).phoneNumber,
        email: (route.params as unknown as { email: string })?.email || undefined,
      });

      await announceToScreenReader('New reset token sent.', { isAlert: true });
      setResendCooldown(60); // 60 second cooldown

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend code';
      await announceToScreenReader(`${errorMessage}. Please try again.`, { isAlert: true });
    }
  };

  const handleBack = () => {
    announceToScreenReader('Going back to forgot password screen');
    setTimeout(() => {
      navigation.goBack();
    }, 300);
  };

  // Auto-focus on token input for better UX
  const handleTokenChange = (text: string) => {
    const sanitizedText = text.replace(/\s+/g, '');
    setValue('token', sanitizedText);

    if (sanitizedText.length > 0) {
      announceToScreenReader(`${sanitizedText.length} characters entered`);
    }
  };

  return (
    <LinearGradient
      colors={[...AppColors.gradientAuth]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <AccessibleButton
                title="Back"
                onPress={handleBack}
                variant="outline"
                size="small"
                accessibilityHint="Return to forgot password screen"
                style={styles.backButton}
                textStyle={styles.backButtonText}
              />
              <View style={styles.logoBubble}>
                <Image
                  source={require('../../assets/images/icon.png')}
                  style={styles.logoIcon}
                  accessibilityIgnoresInvertColors
                />
              </View>
              <Text style={styles.logoText} accessibilityRole="header">
                VOX
              </Text>
            </View>

            <View style={styles.centerContent}>
              <View style={styles.titleContainer}>
                <Text style={styles.title} accessibilityRole="header">
                  Verify Token
                </Text>
                <Text style={styles.description} accessibilityRole="text">
                  Enter the reset token we sent to your email or phone.
                </Text>
              </View>

              <View style={styles.form}>
                <Controller
                  control={control}
                  name="token"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <AccessibleInput
                      label="Reset token"
                      value={value}
                      onChangeText={handleTokenChange}
                      onBlur={onBlur}
                      error={errors.token?.message}
                      onValidationError={handleValidationError}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="one-time-code"
                      accessibilityHint="Enter the reset token"
                      placeholder="Paste reset token"
                      style={styles.tokenInput}
                    />
                  )}
                />

                <AccessibleButton
                  title="Verify Token"
                  onPress={handleSubmit(onSubmit)}
                  disabled={!isValid}
                  loading={isSubmitting}
                  style={styles.submitButton}
                  textStyle={styles.submitButtonText}
                  accessibilityHint="Verify the entered token and continue to password reset"
                />

                {errors.token && (
                  <Text
                    style={styles.errorText}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                  >
                    {errors.token.message}
                  </Text>
                )}
              </View>

              <View style={styles.resendContainer}>
                <Text style={styles.resendText} accessibilityRole="text">
                  Didn't receive the token?
                </Text>
                <AccessibleButton
                  title={resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  onPress={handleResendCode}
                  disabled={resendCooldown > 0}
                  variant="outline"
                  size="small"
                  style={styles.resendButton}
                  textStyle={styles.resendButtonText}
                  accessibilityHint={
                    resendCooldown > 0
                      ? `Wait ${resendCooldown} seconds before resending`
                      : 'Send a new verification code'
                  }
                />
              </View>

              <View style={styles.helpContainer}>
                <Text style={styles.helpText} accessibilityRole="text">
                  The reset token expires in 1 hour. Make sure to check your spam folder if you're using email.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
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
    marginBottom: 12,
  },
  backButton: {
    alignSelf: 'flex-start',
    borderColor: AppColors.primary,
  },
  backButtonText: {
    color: AppColors.primary,
  },
  logoBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
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
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  titleContainer: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: AppColors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: 20,
    marginBottom: 28,
  },
  tokenInput: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: AppColors.primary,
    borderRadius: 14,
  },
  submitButtonText: {
    color: AppColors.white,
  },
  errorText: {
    fontSize: 15,
    color: AppColors.error,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 16,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginBottom: 12,
  },
  resendButton: {
    minWidth: 120,
    borderColor: AppColors.primary,
  },
  resendButtonText: {
    color: AppColors.primary,
  },
  helpContainer: {
    paddingTop: 12,
  },
  helpText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
