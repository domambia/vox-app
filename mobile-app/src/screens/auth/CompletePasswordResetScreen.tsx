import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import { AccessibleInput } from '../../components/accessible/AccessibleInput';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { AccessibleAlert } from '../../components/accessible/AccessibleAlert';
import { authApi } from '../../services/api/auth.api';
import { announceScreenTitle, announceSuccess, announceError } from '../../services/accessibility/accessibilityUtils';
import { validatePassword, passwordsMatch } from '../../utils/validation';

type CompletePasswordResetScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'CompletePasswordReset'>;
type CompletePasswordResetScreenRouteProp = RouteProp<AuthStackParamList, 'CompletePasswordReset'>;

interface Props {
    navigation: CompletePasswordResetScreenNavigationProp;
    route: CompletePasswordResetScreenRouteProp;
}

const CompletePasswordResetScreen: React.FC<Props> = ({ navigation, route }) => {
    const { token } = route.params;
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{
        newPassword?: string;
        confirmPassword?: string;
    }>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        announceScreenTitle('Complete password reset');
    }, []);

    const validateForm = (): boolean => {
        const newErrors: typeof errors = {};

        if (!newPassword) {
            newErrors.newPassword = 'Password is required';
        } else {
            const passwordError = validatePassword(newPassword);
            if (passwordError) {
                newErrors.newPassword = passwordError;
            }
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (!passwordsMatch(newPassword, confirmPassword)) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleComplete = async () => {
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await authApi.completePasswordReset({ token, newPassword });
            announceSuccess('Password reset successful. You can now log in.');
            setTimeout(() => {
                navigation.navigate('Login');
            }, 2000);
        } catch (err: any) {
            const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to reset password';
            setError(errorMessage);
            announceError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    <Text
                        style={styles.title}
                        accessibilityRole="header"
                        accessibilityLabel="Complete password reset"
                    >
                        New Password
                    </Text>

                    <Text
                        style={styles.description}
                        accessibilityRole="text"
                    >
                        Enter your new password below.
                    </Text>

                    {error && (
                        <AccessibleAlert
                            message={error}
                            type="error"
                            style={styles.alert}
                        />
                    )}

                    <AccessibleInput
                        label="New password"
                        value={newPassword}
                        onChangeText={(text) => {
                            setNewPassword(text);
                            if (errors.newPassword) {
                                setErrors({ ...errors, newPassword: undefined });
                            }
                        }}
                        hint="Enter a password with at least 8 characters, one uppercase, one lowercase, and one number"
                        secureTextEntry={!showPassword}
                        autoComplete="password-new"
                        error={errors.newPassword}
                        required
                        autoFocus
                    />

                    <View style={styles.checkboxContainer}>
                        <Text
                            style={styles.checkboxText}
                            onPress={() => setShowPassword(!showPassword)}
                            accessibilityRole="checkbox"
                            accessibilityLabel="Show password"
                            accessibilityState={{ checked: showPassword }}
                        >
                            {showPassword ? '✓' : '☐'} Show password
                        </Text>
                    </View>

                    <AccessibleInput
                        label="Confirm new password"
                        value={confirmPassword}
                        onChangeText={(text) => {
                            setConfirmPassword(text);
                            if (errors.confirmPassword) {
                                setErrors({ ...errors, confirmPassword: undefined });
                            }
                        }}
                        hint="Re-enter your new password to confirm"
                        secureTextEntry={!showConfirmPassword}
                        autoComplete="password-new"
                        error={errors.confirmPassword}
                        required
                    />

                    <View style={styles.checkboxContainer}>
                        <Text
                            style={styles.checkboxText}
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            accessibilityRole="checkbox"
                            accessibilityLabel="Show confirm password"
                            accessibilityState={{ checked: showConfirmPassword }}
                        >
                            {showConfirmPassword ? '✓' : '☐'} Show confirm password
                        </Text>
                    </View>

                    <AccessibleButton
                        label="Reset Password"
                        onPress={handleComplete}
                        hint="Double tap to complete password reset"
                        loading={isLoading}
                        disabled={isLoading}
                        style={styles.button}
                    />

                    <AccessibleButton
                        label="Back"
                        onPress={() => navigation.goBack()}
                        hint="Double tap to go back"
                        variant="secondary"
                        style={styles.button}
                    />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: '#666',
        marginBottom: 32,
    },
    alert: {
        marginBottom: 16,
    },
    checkboxContainer: {
        marginBottom: 16,
        paddingVertical: 8,
    },
    checkboxText: {
        fontSize: 16,
        color: '#000',
    },
    button: {
        width: '100%',
        marginBottom: 12,
    },
});

export default CompletePasswordResetScreen;

