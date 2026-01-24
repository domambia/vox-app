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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { AccessibleInput } from '../../components/accessible/AccessibleInput';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { verifyOTP, sendOTP, resetOTPState } from '../../store/slices/authSlice';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

type OTPVerificationScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'OTPVerification'>;

interface OTPFormData {
    otpCode: string;
}

// Validation schema
const otpSchema = yup.object().shape({
    otpCode: yup
        .string()
        .required('OTP code is required')
        .matches(/^\d{6}$/, 'Please enter a valid 6-digit code'),
});

/**
 * OTP Verification Screen - Enter OTP to complete authentication
 * Voice-first design for OTP verification
 */
export const OTPVerificationScreen: React.FC = () => {
    const navigation = useNavigation<OTPVerificationScreenNavigationProp>();
    const dispatch = useAppDispatch();
    const { isLoading, error, otpPhoneNumber, otpPurpose, otpExpiresIn } = useAppSelector(state => state.auth);

    const [resendCooldown, setResendCooldown] = useState(0);

    const {
        control,
        handleSubmit,
        formState: { errors, isValid },
        setError,
        clearErrors,
        setValue,
    } = useForm<OTPFormData>({
        resolver: yupResolver(otpSchema),
        mode: 'onChange',
        defaultValues: {
            otpCode: '',
        },
    });

    // Countdown for resend button
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    // Redirect if no OTP was sent
    useEffect(() => {
        if (!otpPhoneNumber || !otpPurpose) {
            navigation.goBack();
        }
    }, [otpPhoneNumber, otpPurpose, navigation]);

    // Announce screen on load
    useEffect(() => {
        if (otpPhoneNumber) {
            const announceScreen = async () => {
                setTimeout(async () => {
                    await announceToScreenReader(
                        `OTP verification screen. Enter the 6-digit code sent to ${otpPhoneNumber}.`
                    );
                }, 500);
            };

            announceScreen();
        }
    }, [otpPhoneNumber]);

    const handleValidationError = async (fieldName: string, errorMessage: string) => {
        await announceToScreenReader(`${fieldName}: ${errorMessage}`, { isAlert: true });
    };

    const onSubmit = async (data: OTPFormData) => {
        if (!otpPhoneNumber || !otpPurpose) return;

        try {
            clearErrors();
            await announceToScreenReader('Verifying code. Please wait.');

            const result = await dispatch(verifyOTP({
                phoneNumber: otpPhoneNumber,
                otpCode: data.otpCode,
                purpose: otpPurpose,
            }));

            if (verifyOTP.fulfilled.match(result)) {
                const successMessage = otpPurpose === 'REGISTRATION'
                    ? 'Account created successfully. Welcome to VOX!'
                    : 'Login successful. Welcome back to VOX!';
                await announceToScreenReader(successMessage, { isAlert: true });
                // Navigation will be handled by auth state change in root navigator
            } else {
                const errorMessage = result.payload as string || 'OTP verification failed';
                await announceToScreenReader(`Verification failed. ${errorMessage}`, { isAlert: true });
                setError('otpCode', { message: errorMessage });
            }
        } catch (error) {
            const errorMessage = 'An unexpected error occurred';
            await announceToScreenReader(`Error: ${errorMessage}`, { isAlert: true });
            setError('otpCode', { message: errorMessage });
        }
    };

    const handleResendCode = async () => {
        if (resendCooldown > 0 || !otpPhoneNumber || !otpPurpose) return;

        try {
            await announceToScreenReader('Resending verification code. Please wait.');

            const result = await dispatch(sendOTP({
                phoneNumber: otpPhoneNumber,
                purpose: otpPurpose,
            }));

            if (sendOTP.fulfilled.match(result)) {
                await announceToScreenReader('New verification code sent.', { isAlert: true });
                setResendCooldown(60); // 60 second cooldown
            } else {
                await announceToScreenReader('Failed to resend code. Please try again.', { isAlert: true });
            }
        } catch (error) {
            await announceToScreenReader('Failed to resend code. Please try again.', { isAlert: true });
        }
    };

    const handleBack = () => {
        dispatch(resetOTPState());
        announceToScreenReader('Going back to previous screen');
        setTimeout(() => {
            navigation.goBack();
        }, 300);
    };

    // Auto-focus on OTP input for better UX
    const handleOTPChange = (text: string) => {
        // Remove any non-numeric characters
        const numericText = text.replace(/[^0-9]/g, '');
        setValue('otpCode', numericText);

        // Announce current input for accessibility
        if (numericText.length > 0) {
            announceToScreenReader(`${numericText.length} of 6 digits entered`);
        }
    };

    if (!otpPhoneNumber || !otpPurpose) {
        return null; // Will redirect
    }

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
                                accessibilityHint="Return to previous screen"
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
                                    Verify Your Phone
                                </Text>
                                <Text style={styles.description} accessibilityRole="text">
                                    Enter the 6-digit code we sent to{'\n'}
                                    <Text style={styles.phoneNumber}>{otpPhoneNumber}</Text>
                                </Text>
                            </View>

                            <View style={styles.form}>
                                <Controller
                                    control={control}
                                    name="otpCode"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <AccessibleInput
                                            label="Verification code"
                                            value={value}
                                            onChangeText={handleOTPChange}
                                            onBlur={onBlur}
                                            error={errors.otpCode?.message}
                                            onValidationError={handleValidationError}
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            autoComplete="one-time-code"
                                            accessibilityHint="Enter the 6-digit verification code"
                                            placeholder="000000"
                                            style={styles.otpInput}
                                        />
                                    )}
                                />

                                <AccessibleButton
                                    title="Verify Code"
                                    onPress={handleSubmit(onSubmit)}
                                    disabled={!isValid}
                                    loading={isLoading}
                                    style={styles.submitButton}
                                    textStyle={styles.submitButtonText}
                                    accessibilityHint="Verify the entered code and complete authentication"
                                />

                                {error && (
                                    <Text
                                        style={styles.errorText}
                                        accessibilityRole="alert"
                                        accessibilityLiveRegion="polite"
                                    >
                                        {error}
                                    </Text>
                                )}
                            </View>

                            <View style={styles.resendContainer}>
                                <Text style={styles.resendText} accessibilityRole="text">
                                    Didn't receive the code?
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
                                    The verification code expires in 10 minutes. Make sure to check your messages.
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
    phoneNumber: {
        fontWeight: '600',
        color: '#4B3BA9',
    },
    form: {
        gap: 20,
        marginBottom: 28,
    },
    otpInput: {
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 8,
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
        marginTop: 16,
    },
    resendContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    resendText: {
        fontSize: 13,
        color: '#5E55A6',
        marginBottom: 12,
    },
    resendButton: {
        minWidth: 120,
        borderColor: '#7B5CFA',
    },
    resendButtonText: {
        color: '#7B5CFA',
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
