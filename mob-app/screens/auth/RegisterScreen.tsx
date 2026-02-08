import React, { useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { LinearGradient } from 'expo-linear-gradient';
import { AppColors } from '../../constants/theme';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { AccessibleInput } from '../../components/accessible/AccessibleInput';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { sendOTP, getAllowedCountries, type AllowedCountry } from '../../store/slices/authSlice';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

interface AccountInfoFormData {
  phoneNumber: string;
}

// Validation schema – normalize by stripping spaces so "+1 234 567 8900" is accepted
const accountInfoSchema = yup.object().shape({
  phoneNumber: yup
    .string()
    .required('Phone number is required')
    .transform((val) => (typeof val === 'string' ? val.replace(/\s/g, '') : val))
    .matches(/^\+[1-9]\d{1,14}$/, 'Phone number must be in international format (e.g., +1234567890)'),
});

/**
 * Multi-Step Registration Flow - Voice-First Design
 * Step 1: Account Information
 * Step 2: Profile Basics
 * Step 3: Accessibility Preferences
 */
export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { isLoading, error, errorCode, allowedCountries, allowedCountriesLoaded } = useAppSelector((state: any) => state.auth);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setError,
    clearErrors,
  } = useForm<AccountInfoFormData>({
    resolver: yupResolver(accountInfoSchema),
    mode: 'onChange',
    defaultValues: {
      phoneNumber: '',
    },
  });

  useEffect(() => {
    dispatch(getAllowedCountries());
  }, [dispatch]);

  useEffect(() => {
    const announceScreen = async () => {
      setTimeout(async () => {
        await announceToScreenReader('Create account screen. Enter your phone number to get started.');
      }, 500);
    };
    announceScreen();
  }, []);

  const handleValidationError = async (fieldName: string, errorMessage: string) => {
    await announceToScreenReader(`${fieldName}: ${errorMessage}`, { isAlert: true });
  };

  const onSubmit = async (data: AccountInfoFormData) => {
    try {
      clearErrors();

      await announceToScreenReader('Sending verification code. Please wait.');

      const result = await dispatch(sendOTP({
        phoneNumber: data.phoneNumber,
        purpose: 'REGISTRATION',
      }));

      if (sendOTP.fulfilled.match(result)) {
        await announceToScreenReader('Verification code sent. Please check your phone.', { isAlert: true });
        setTimeout(() => {
          navigation.navigate('OTPVerification');
        }, 1000);
      } else {
        const payload = result.payload as { message?: string } | string | undefined;
        const errorMessage = typeof payload === 'object' && payload?.message ? payload.message : (payload as string) || 'Failed to send verification code';
        await announceToScreenReader(`Failed to send code. ${errorMessage}`, { isAlert: true });
        setError('root', { message: errorMessage });
      }
    } catch (error) {
      const errorMessage = 'An unexpected error occurred';
      await announceToScreenReader(`Error: ${errorMessage}`, { isAlert: true });
      setError('root', { message: errorMessage });
    }
  };

  const handleBack = () => {
    announceToScreenReader('Going back to welcome screen');
    setTimeout(() => {
      navigation.goBack();
    }, 300);
  };

  return (
    <LinearGradient
      colors={['#F2ECFF', '#D6C9FF', '#B7A1FF']}
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
                accessibilityHint="Return to welcome screen"
                style={styles.backButton}
                textStyle={styles.backButtonText}
              />
              <View style={styles.logoBubble}>
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={styles.logoIcon}
                  accessibilityIgnoresInvertColors
                />
              </View>
              <Text style={styles.logoText} accessibilityRole="header">
                LiamApp
              </Text>
            </View>

            <View style={styles.centerContent}>
              <View style={styles.titleContainer}>
                <Text style={styles.title} accessibilityRole="header">
                  Create Account
                </Text>
                <Text style={styles.description} accessibilityRole="text">
                  Enter your phone number to get started with LiamApp.
                </Text>
                {allowedCountriesLoaded && allowedCountries.length > 0 && (
                  <Text
                    style={styles.countriesText}
                    accessibilityRole="text"
                    accessibilityLabel={`Registration available in: ${allowedCountries.map((c: AllowedCountry) => c.name).join(', ')}`}
                  >
                    Available in: {allowedCountries.map((c: AllowedCountry) => c.name).join(', ')}
                  </Text>
                )}
              </View>

              <View style={styles.form}>
                <Controller
                  control={control}
                  name="phoneNumber"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <AccessibleInput
                      label="Phone number"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.phoneNumber?.message}
                      onValidationError={handleValidationError}
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      autoComplete="tel"
                      accessibilityHint="Enter your phone number with country code"
                      placeholder="+1234567890"
                    />
                  )}
                />

                <AccessibleButton
                  title="Send Code"
                  onPress={handleSubmit(onSubmit)}
                  disabled={!isValid}
                  loading={isLoading}
                  style={styles.submitButton}
                  textStyle={styles.submitButtonText}
                  accessibilityHint="Send verification code to your phone number"
                />

                {(errors.root?.message || error) && (
                  <Text
                    style={styles.errorText}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                    accessibilityLabel={errorCode ? `${errorCode}: ${errors.root?.message || error}` : undefined}
                  >
                    {errors.root?.message || error}
                  </Text>
                )}
              </View>

              <View style={styles.infoContainer}>
                <Text style={styles.infoText} accessibilityRole="text">
                  You'll be able to add your name, email, and other details in your profile after verification.
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
  countriesText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  form: {
    gap: 20,
    marginBottom: 28,
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
    marginTop: 12,
  },
  infoContainer: {
    paddingTop: 16,
  },
  infoText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
