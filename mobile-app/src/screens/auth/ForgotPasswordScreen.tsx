import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import { AccessibleInput } from '../../components/accessible/AccessibleInput';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { AccessibleAlert } from '../../components/accessible/AccessibleAlert';
import { authApi } from '../../services/api/auth.api';
import { announceScreenTitle, announceSuccess, announceError } from '../../services/accessibility/accessibilityUtils';
import { isValidPhoneNumber, isValidEmail } from '../../utils/validation';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

interface Props {
    navigation: ForgotPasswordScreenNavigationProp;
}

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
    const [phoneNumberOrEmail, setPhoneNumberOrEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        announceScreenTitle('Reset password');
    }, []);

    const handleRequestReset = async () => {
        if (!phoneNumberOrEmail.trim()) {
            setError('Phone number or email is required');
            return;
        }

        if (!isValidPhoneNumber(phoneNumberOrEmail) && !isValidEmail(phoneNumberOrEmail)) {
            setError('Please enter a valid phone number or email address');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await authApi.requestPasswordReset({ phoneNumber: phoneNumberOrEmail });
            setSuccess(true);
            announceSuccess('Password reset link sent to your email or phone');
            setTimeout(() => {
                navigation.navigate('VerifyResetToken', { phoneNumber: phoneNumberOrEmail });
            }, 2000);
        } catch (err: any) {
            const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to request password reset';
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
                        accessibilityLabel="Reset password"
                    >
                        Reset Password
                    </Text>

                    <Text
                        style={styles.description}
                        accessibilityRole="text"
                    >
                        Enter your phone number or email address to receive a password reset link.
                    </Text>

                    {error && (
                        <AccessibleAlert
                            message={error}
                            type="error"
                            style={styles.alert}
                        />
                    )}

                    {success && (
                        <AccessibleAlert
                            message="Password reset link sent. Please check your email or phone."
                            type="success"
                            style={styles.alert}
                        />
                    )}

                    <AccessibleInput
                        label="Phone number or email address"
                        value={phoneNumberOrEmail}
                        onChangeText={(text) => {
                            setPhoneNumberOrEmail(text);
                            setError(null);
                        }}
                        hint="Enter your phone number or email address"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        error={error && !success ? error : undefined}
                        required
                        autoFocus
                    />

                    <AccessibleButton
                        label="Send Reset Link"
                        onPress={handleRequestReset}
                        hint="Double tap to send password reset link"
                        loading={isLoading}
                        disabled={isLoading || success}
                        style={styles.button}
                    />

                    <AccessibleButton
                        label="Back to Login"
                        onPress={() => navigation.navigate('Login')}
                        hint="Double tap to go back to login screen"
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
    button: {
        width: '100%',
        marginBottom: 12,
    },
});

export default ForgotPasswordScreen;

