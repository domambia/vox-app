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
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { AccessibleInput } from '../../components/accessible/AccessibleInput';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { apiClient } from '../../services/api/apiClient';

type CompletePasswordResetScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'CompletePasswordReset'>;
type CompletePasswordResetScreenRouteProp = RouteProp<AuthStackParamList, 'CompletePasswordReset'>;

interface CompleteResetFormData {
    newPassword: string;
    confirmPassword: string;
}

// Validation schema
const completeResetSchema = yup.object().shape({
    newPassword: yup
        .string()
        .required('New password is required')
        .min(8, 'Password must be at least 8 characters')
        .matches(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        ),
    confirmPassword: yup
        .string()
        .required('Please confirm your new password')
        .oneOf([yup.ref('newPassword')], 'Passwords must match'),
});

/**
 * Complete Password Reset Screen - Set New Password
 * Voice-first design for completing password reset
 */
export const CompletePasswordResetScreen: React.FC = () => {
    const navigation = useNavigation<CompletePasswordResetScreenNavigationProp>();
    const route = useRoute<CompletePasswordResetScreenRouteProp>();
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors, isValid, isSubmitting },
        setError,
        clearErrors,
        watch,
    } = useForm<CompleteResetFormData>({
        resolver: yupResolver(completeResetSchema),
        mode: 'onChange',
        defaultValues: {
            newPassword: '',
            confirmPassword: '',
        },
    });

    const newPassword = watch('newPassword');

    // Announce screen on load
    useEffect(() => {
        const announceScreen = async () => {
            setTimeout(async () => {
                await announceToScreenReader(
                    'Set new password screen. Create a strong password for your account.'
                );
            }, 500);
        };

        announceScreen();
    }, []);

    const handleValidationError = async (fieldName: string, errorMessage: string) => {
        await announceToScreenReader(`${fieldName}: ${errorMessage}`, { isAlert: true });
    };

    const onSubmit = async (data: CompleteResetFormData) => {
        try {
            clearErrors();
            await announceToScreenReader('Setting new password. Please wait.');

            if (!route.params?.token) {
                throw new Error('Reset token is missing. Please restart password reset.');
            }

            await apiClient.post('/auth/password-reset/complete', {
                token: route.params.token,
                newPassword: data.newPassword,
            });

            await announceToScreenReader(
                'Password reset successfully. You can now log in with your new password.',
                { isAlert: true }
            );

            // Navigate back to login screen
            setTimeout(() => {
                // Navigate back to login (need to go back multiple screens)
                navigation.popToTop();
            }, 2000);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
            await announceToScreenReader(`${errorMessage}. Please try again.`, { isAlert: true });
            setError('root', { message: errorMessage });
        }
    };

    const toggleShowNewPassword = () => {
        const newState = !showNewPassword;
        setShowNewPassword(newState);
        announceToScreenReader(newState ? 'New password will be shown' : 'New password will be hidden');
    };

    const toggleShowConfirmPassword = () => {
        const newState = !showConfirmPassword;
        setShowConfirmPassword(newState);
        announceToScreenReader(newState ? 'Confirm password will be shown' : 'Confirm password will be hidden');
    };

    const getPasswordStrength = (password: string): { level: string; color: string; description: string } => {
        if (password.length === 0) return { level: '', color: '#6b7280', description: '' };

        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasLength = password.length >= 8;

        const criteria = [hasLower, hasUpper, hasNumber, hasLength];
        const metCriteria = criteria.filter(Boolean).length;

        if (metCriteria < 2) {
            return {
                level: 'Weak',
                color: '#ef4444',
                description: 'Add uppercase, lowercase, and numbers'
            };
        } else if (metCriteria < 4) {
            return {
                level: 'Medium',
                color: '#f59e0b',
                description: 'Add more character variety'
            };
        } else {
            return {
                level: 'Strong',
                color: '#10b981',
                description: 'Password meets all requirements'
            };
        }
    };

    const passwordStrength = getPasswordStrength(newPassword || '');

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
                            <Text style={styles.headerTitle} accessibilityRole="header">
                                Reset Password
                            </Text>
                        </View>

                        <View style={styles.centerContent}>
                            <View style={styles.titleContainer}>
                                <Text style={styles.title} accessibilityRole="header">
                                    Set New Password
                                </Text>
                                <Text style={styles.description} accessibilityRole="text">
                                    Create a strong password for your account.
                                </Text>
                            </View>

                            <View style={styles.requirementsContainer}>
                                <Text style={styles.requirementsTitle} accessibilityRole="header">
                                    Password Requirements:
                                </Text>
                                <View style={styles.requirementsList}>
                                    <Text style={styles.requirement} accessibilityRole="text">
                                        • At least 8 characters long
                                    </Text>
                                    <Text style={styles.requirement} accessibilityRole="text">
                                        • One uppercase letter (A-Z)
                                    </Text>
                                    <Text style={styles.requirement} accessibilityRole="text">
                                        • One lowercase letter (a-z)
                                    </Text>
                                    <Text style={styles.requirement} accessibilityRole="text">
                                        • One number (0-9)
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.form}>
                                <Controller
                                    control={control}
                                    name="newPassword"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View>
                                            <AccessibleInput
                                                label="New password"
                                                value={value}
                                                onChangeText={onChange}
                                                onBlur={onBlur}
                                                error={errors.newPassword?.message}
                                                onValidationError={handleValidationError}
                                                secureTextEntry={!showNewPassword}
                                                autoComplete="password-new"
                                                accessibilityHint="Enter your new password"
                                            />

                                            {value && value.length > 0 && (
                                                <View style={styles.strengthContainer}>
                                                    <Text
                                                        style={[styles.strengthText, { color: passwordStrength.color }]}
                                                        accessibilityRole="text"
                                                    >
                                                        Strength: {passwordStrength.level}
                                                    </Text>
                                                    <Text style={styles.strengthDescription} accessibilityRole="text">
                                                        {passwordStrength.description}
                                                    </Text>
                                                </View>
                                            )}

                                            <AccessibleButton
                                                title={showNewPassword ? 'Hide password' : 'Show password'}
                                                onPress={toggleShowNewPassword}
                                                variant="outline"
                                                size="small"
                                                style={styles.showPasswordButton}
                                                textStyle={styles.showPasswordButtonText}
                                                accessibilityHint="Toggle visibility of new password"
                                            />
                                        </View>
                                    )}
                                />

                                <Controller
                                    control={control}
                                    name="confirmPassword"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View>
                                            <AccessibleInput
                                                label="Confirm new password"
                                                value={value}
                                                onChangeText={onChange}
                                                onBlur={onBlur}
                                                error={errors.confirmPassword?.message}
                                                onValidationError={handleValidationError}
                                                secureTextEntry={!showConfirmPassword}
                                                autoComplete="password-new"
                                                accessibilityHint="Re-enter your new password to confirm"
                                            />

                                            <AccessibleButton
                                                title={showConfirmPassword ? 'Hide password' : 'Show password'}
                                                onPress={toggleShowConfirmPassword}
                                                variant="outline"
                                                size="small"
                                                style={styles.showPasswordButton}
                                                textStyle={styles.showPasswordButtonText}
                                                accessibilityHint="Toggle visibility of confirm password"
                                            />
                                        </View>
                                    )}
                                />

                                <AccessibleButton
                                    title="Reset Password"
                                    onPress={handleSubmit(onSubmit)}
                                    disabled={!isValid}
                                    loading={isSubmitting}
                                    style={styles.submitButton}
                                    textStyle={styles.submitButtonText}
                                    accessibilityHint="Complete password reset with the new password"
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

                            <View style={styles.securityContainer}>
                                <Text style={styles.securityText} accessibilityRole="text">
                                    🔒 Your password is encrypted and stored securely. We will never ask you to share your password.
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
    headerTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5E55A6',
        textAlign: 'center',
    },
    logoBubble: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
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
        marginBottom: 4,
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
        color: '#3A2C7B',
        textAlign: 'center',
        marginBottom: 8,
    },
    description: {
        fontSize: 15,
        color: '#5E55A6',
        textAlign: 'center',
        lineHeight: 22,
    },
    requirementsContainer: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E0D6FF',
    },
    requirementsTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#4B3BA9',
        marginBottom: 12,
    },
    requirementsList: {
        gap: 4,
    },
    requirement: {
        fontSize: 13,
        color: '#5E55A6',
        lineHeight: 18,
    },
    form: {
        gap: 18,
        marginBottom: 24,
    },
    strengthContainer: {
        marginTop: 8,
        paddingHorizontal: 12,
    },
    strengthText: {
        fontSize: 13,
        fontWeight: '600',
    },
    strengthDescription: {
        fontSize: 12,
        color: '#5E55A6',
        marginTop: 2,
    },
    showPasswordButton: {
        alignSelf: 'flex-start',
        marginTop: 8,
        borderColor: '#7B5CFA',
    },
    showPasswordButtonText: {
        color: '#7B5CFA',
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
    securityContainer: {
        paddingTop: 12,
    },
    securityText: {
        fontSize: 13,
        color: '#5E55A6',
        textAlign: 'center',
        lineHeight: 18,
    },
});
