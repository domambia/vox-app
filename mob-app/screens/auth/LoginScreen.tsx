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
  InteractionManager,
} from 'react-native';
import { useNavigation, StackActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { LinearGradient } from 'expo-linear-gradient';
import { AppColors } from '../../constants/theme';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { AccessibleInput } from '../../components/accessible/AccessibleInput';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { sendOTP, clearError, initializeAuth } from '../../store/slices/authSlice';
import { showToast } from '../../store/slices/toastSlice';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface LoginFormData {
  phoneNumber: string;
}

// Validation schema
const loginSchema = yup.object().shape({
  phoneNumber: yup
    .string()
    .required('Phone number is required')
    .matches(/^\+[1-9]\d{1,14}$/, 'Phone number must be in international format (e.g., +1234567890)'),
});

/**
 * Login Screen - Voice-First Authentication
 * CRITICAL: Must work completely without visual reference
 * Every element announced, every action confirmed
 */
export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { isLoading, error, errorCode, isOffline, isAuthenticated } = useAppSelector((state: any) => state.auth);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setError: setFormError,
    clearErrors,
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      phoneNumber: '+35699123456',
    },
  });

  // If we have a stored token but aren't authenticated yet, restore session (then App will show Main)
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem('accessToken').then((token) => {
      if (!cancelled && token && !isAuthenticated) {
        dispatch(initializeAuth());
      }
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch, isAuthenticated]);

  // Announce screen on load - CRITICAL for accessibility
  useEffect(() => {
    const announceScreen = async () => {
      setTimeout(async () => {
        await announceToScreenReader('Log in to LiamApp screen. Enter your phone number to sign in.');

        // Announce offline status if applicable
        if (isOffline) {
          setTimeout(() => {
            announceToScreenReader('You are currently offline. Some features may not work.');
          }, 1000);
        }
      }, 500);
    };

    announceScreen();
  }, [isOffline]);

  // Handle validation errors with voice feedback
  const handleValidationError = async (fieldName: string, errorMessage: string) => {
    await announceToScreenReader(`${fieldName}: ${errorMessage}`, { isAlert: true });
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearErrors();
      dispatch(clearError());

      await announceToScreenReader('Sending verification code. Please wait.');

      // In development, devBypassOtp: true makes backend return tokens directly (skip OTP screen)
      const result = await dispatch(sendOTP({
        phoneNumber: data.phoneNumber,
        purpose: 'LOGIN',
        ...(__DEV__ ? { devBypassOtp: true } : {}),
      }));

      if (sendOTP.fulfilled.match(result)) {
        const payload = result.payload as { token?: string; message?: string };
        // Dev bypass or token in response: we're logged in, app will switch to Main/Profile
        if (payload?.token) {
          await announceToScreenReader('Logged in. Opening profile.', { isAlert: true });
          return;
        }
        await announceToScreenReader('Verification code sent. Please check your phone.', { isAlert: true });
        InteractionManager.runAfterInteractions(() => {
          navigation.dispatch(StackActions.push('OTPVerification'));
        });
      } else {
        const payload = result.payload as { message?: string } | string | undefined;
        const errorMessage = typeof payload === 'object' && payload?.message ? payload.message : (payload as string) || 'Failed to send verification code';
        dispatch(showToast({ message: errorMessage, type: 'error' }));
        await announceToScreenReader(`Failed to send code. ${errorMessage}`, { isAlert: true });
        setFormError('root', { message: errorMessage });
      }
    } catch (error) {
      const errorMessage = 'An unexpected error occurred';
      dispatch(showToast({ message: errorMessage, type: 'error' }));
      await announceToScreenReader(`Error: ${errorMessage}`, { isAlert: true });
      setFormError('root', { message: errorMessage });
    }
  };


  const handleCreateAccount = () => {
    announceToScreenReader('Navigate to create account screen');
    setTimeout(() => {
      navigation.navigate('Register');
    }, 300);
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
                <Text
                  style={styles.title}
                  accessibilityRole="header"
                  accessibilityLabel="Log in to LiamApp"
                >
                  Log in
                </Text>
                <Text style={styles.description} accessibilityRole="text">
                  Enter your phone number to sign in.
                </Text>
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
                      placeholder="+35699123456"
                    />
                  )}
                />

                <AccessibleButton
                  title="Send Code"
                  onPress={handleSubmit(onSubmit)}
                  loading={isLoading}
                  disabled={!isValid || isLoading}
                  style={styles.loginButton}
                  textStyle={styles.loginButtonText}
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

                <View style={styles.actions}>
                  <AccessibleButton
                    title="Create account"
                    onPress={handleCreateAccount}
                    variant="secondary"
                    size="medium"
                    accessibilityHint="Create a new LiamApp account"
                    style={styles.createAccountButton}
                    textStyle={styles.createAccountButtonText}
                  />
                </View>
              </View>

              {isOffline && (
                <View style={styles.offlineContainer}>
                  <Text
                    style={styles.offlineText}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                  >
                    You are offline. Some features may not work.
                  </Text>
                </View>
              )}
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
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  titleContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: AppColors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: 18,
  },
  loginButton: {
    marginTop: 20,
    backgroundColor: AppColors.primary,
    borderRadius: 14,
  },
  loginButtonText: {
    color: AppColors.white,
  },
  errorText: {
    fontSize: 15,
    color: AppColors.error,
    textAlign: 'center',
    fontWeight: '500',
  },
  actions: {
    gap: 16,
    marginTop: 20,
  },
  createAccountButton: {
    marginTop: 8,
    backgroundColor: AppColors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  createAccountButtonText: {
    color: AppColors.primaryDark,
  },
  offlineContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: AppColors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  offlineText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
});
