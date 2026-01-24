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
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { AccessibleInput } from '../../components/accessible/AccessibleInput';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { apiClient } from '../../services/api/apiClient';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

interface ForgotPasswordFormData {
    phoneNumber: string;
    email?: string;
}

// Validation schema
const forgotPasswordSchema = yup.object().shape({
    phoneNumber: yup
        .string()
        .required('Phone number is required')
        .matches(/^\+[1-9]\d{1,14}$/, 'Phone number must be in international format (e.g., +35612345678)'),
    email: yup
        .string()
        .email('Please enter a valid email address')
        .optional()
        .nullable()
        .transform((value) => (value && value.length === 0 ? null : value)),
});

/**
 * Forgot Password Screen - Request Password Reset
 * Voice-first design for password reset requests
 */
export const ForgotPasswordScreen: React.FC = () => {
    const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();

    const {
        control,
        handleSubmit,
        formState: { errors, isValid, isSubmitting },
        setError,
        clearErrors,
    } = useForm<ForgotPasswordFormData>({
        resolver: yupResolver(forgotPasswordSchema),
        mode: 'onChange',
        defaultValues: {
            phoneNumber: '',
            email: '',
        },
    });

    // Announce screen on load
    useEffect(() => {
        const announceScreen = async () => {
            setTimeout(async () => {
            await announceToScreenReader('Forgot password screen. Enter your phone number to reset your password.');
            }, 500);
        };

        announceScreen();
    }, []);

    const handleValidationError = async (fieldName: string, errorMessage: string) => {
        await announceToScreenReader(`${fieldName}: ${errorMessage}`, { isAlert: true });
    };

    const onSubmit = async (data: ForgotPasswordFormData) => {
        try {
            clearErrors();
            await announceToScreenReader('Sending password reset request. Please wait.');

            const response = await apiClient.post('/auth/password-reset/request', {
                phoneNumber: data.phoneNumber,
                email: data.email || undefined,
            });

            const { resetToken } = response.data.data || {};

            await announceToScreenReader(
                'Password reset instructions sent. Check your email or phone for the reset token.',
                { isAlert: true }
            );

            // Navigate to verification screen
            setTimeout(() => {
                navigation.navigate('VerifyResetToken', {
                    phoneNumber: data.phoneNumber,
                    email: data.email || undefined,
                    resetToken,
                });
            }, 1000);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send password reset request';
            await announceToScreenReader(`${errorMessage}. Please try again.`, { isAlert: true });
            setError('root', { message: errorMessage });
        }
    };

    const handleBack = () => {
        announceToScreenReader('Going back to login screen');
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
                                accessibilityHint="Return to login screen"
                                style={styles.backButton}
                                textStyle={styles.backButtonText}
                            />
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
                        </View>

                        <View style={styles.centerContent}>
                            <View style={styles.titleContainer}>
                                <Text style={styles.title} accessibilityRole="header">
                                    Reset Password
                                </Text>
                                <Text style={styles.description} accessibilityRole="text">
                                    Enter your phone number and optional email and we'll send you instructions to reset your password.
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
                                            accessibilityHint="Enter the phone number associated with your account"
                                            placeholder="+35612345678"
                                        />
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name="email"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <AccessibleInput
                                            label="Email address (optional)"
                                            value={value || ''}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            error={errors.email?.message}
                                            onValidationError={handleValidationError}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoComplete="email"
                                            accessibilityHint="Optional email to verify your account"
                                        />
                                    )}
                                />

                                <AccessibleButton
                                    title="Send Reset Instructions"
                                    onPress={handleSubmit(onSubmit)}
                                    disabled={!isValid}
                                    loading={isSubmitting}
                                    style={styles.submitButton}
                                    textStyle={styles.submitButtonText}
                                    accessibilityHint="Send password reset instructions"
                                />

                                {errors.root && (
                                    <Text
                                        style={styles.errorText}
                                        accessibilityRole="alert"
                                        accessibilityLiveRegion="polite"
                                    >
                                        {errors.root.message}
                                    </Text>
                                )}
                            </View>

                            <View style={styles.helpContainer}>
                                <Text style={styles.helpText} accessibilityRole="text">
                                    If you don't receive the reset instructions within a few minutes, please check your spam folder or try again.
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
        borderColor: '#7B5CFA',
    },
    backButtonText: {
        color: '#7B5CFA',
    },
    logoBubble: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 10,
        shadowColor: '#6D4CFF',
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
        color: '#3A2C7B',
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
        color: '#3A2C7B',
        textAlign: 'center',
        marginBottom: 10,
    },
    description: {
        fontSize: 15,
        color: '#5E55A6',
        textAlign: 'center',
        lineHeight: 22,
    },
    form: {
        gap: 20,
        marginBottom: 28,
    },
    submitButton: {
        marginTop: 8,
        backgroundColor: '#7B5CFA',
        borderRadius: 14,
    },
    submitButtonText: {
        color: '#FFFFFF',
    },
    errorText: {
        fontSize: 15,
        color: '#ef4444',
        textAlign: 'center',
        fontWeight: '500',
        marginTop: 12,
    },
    helpContainer: {
        paddingTop: 12,
    },
    helpText: {
        fontSize: 13,
        color: '#5E55A6',
        textAlign: 'center',
        lineHeight: 18,
    },
});
