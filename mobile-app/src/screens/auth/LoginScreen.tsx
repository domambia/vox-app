import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import { AccessibleInput } from '../../components/accessible/AccessibleInput';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { AccessibleAlert } from '../../components/accessible/AccessibleAlert';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { login, clearError } from '../../store/slices/authSlice';
import { announceScreenTitle, announceLoading } from '../../services/accessibility/accessibilityUtils';
import { isValidPhoneNumber, isValidEmail } from '../../utils/validation';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
    navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const { isLoading, error } = useAppSelector((state) => state.auth);

    const [phoneNumberOrEmail, setPhoneNumberOrEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localErrors, setLocalErrors] = useState<{ phoneNumberOrEmail?: string; password?: string }>({});

    useEffect(() => {
        announceScreenTitle('Log in to VOX');
    }, []);

    useEffect(() => {
        if (error) {
            setLocalErrors({});
        }
    }, [error]);

    const validateForm = (): boolean => {
        const errors: { phoneNumberOrEmail?: string; password?: string } = {};

        if (!phoneNumberOrEmail.trim()) {
            errors.phoneNumberOrEmail = 'Phone number or email is required';
        } else if (!isValidPhoneNumber(phoneNumberOrEmail) && !isValidEmail(phoneNumberOrEmail)) {
            errors.phoneNumberOrEmail = 'Please enter a valid phone number or email address';
        }

        if (!password) {
            errors.password = 'Password is required';
        }

        setLocalErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleLogin = async () => {
        if (!validateForm()) {
            return;
        }

        dispatch(clearError());
        announceLoading('Logging in');

        try {
            await dispatch(login({ phoneNumber: phoneNumberOrEmail, password })).unwrap();
            // Navigation will happen automatically via AppNavigator based on auth state
        } catch (err) {
            // Error is handled in the slice
        }
    };

    const handleForgotPassword = () => {
        navigation.navigate('ForgotPassword');
    };

    const handleRegister = () => {
        navigation.navigate('RegisterStepOne');
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    {/* Screen Header - Auto-announced on load */}
                    <Text
                        style={styles.title}
                        accessibilityRole="header"
                        accessibilityLabel="Log in to VOX"
                    >
                        Log in
                    </Text>

                    {/* Error Alert */}
                    {error && (
                        <AccessibleAlert
                            message={error}
                            type="error"
                            style={styles.alert}
                        />
                    )}

                    {/* Phone/Email Input */}
                    <AccessibleInput
                        label="Phone number or email address"
                        value={phoneNumberOrEmail}
                        onChangeText={(text) => {
                            setPhoneNumberOrEmail(text);
                            if (localErrors.phoneNumberOrEmail) {
                                setLocalErrors({ ...localErrors, phoneNumberOrEmail: undefined });
                            }
                        }}
                        hint="Enter your phone number or email address"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        error={localErrors.phoneNumberOrEmail}
                        required
                        autoFocus
                    />

                    {/* Password Input */}
                    <AccessibleInput
                        label="Password"
                        value={password}
                        onChangeText={(text) => {
                            setPassword(text);
                            if (localErrors.password) {
                                setLocalErrors({ ...localErrors, password: undefined });
                            }
                        }}
                        hint="Enter your password"
                        secureTextEntry={!showPassword}
                        autoComplete="password"
                        error={localErrors.password}
                        required
                    />

                    {/* Show Password Toggle */}
                    <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => setShowPassword(!showPassword)}
                        accessibilityRole="checkbox"
                        accessibilityLabel="Show password"
                        accessibilityState={{ checked: showPassword }}
                        accessibilityHint="Double tap to toggle password visibility"
                    >
                        <Text style={styles.checkboxText}>
                            {showPassword ? '✓' : '☐'} Show password
                        </Text>
                    </TouchableOpacity>

                    {/* Login Button */}
                    <AccessibleButton
                        label="Log in"
                        onPress={handleLogin}
                        hint="Double tap to log in to your account"
                        loading={isLoading}
                        disabled={isLoading}
                        style={styles.loginButton}
                    />

                    {/* Forgot Password Link */}
                    <TouchableOpacity
                        onPress={handleForgotPassword}
                        style={styles.linkContainer}
                        accessibilityRole="button"
                        accessibilityLabel="Forgot password"
                        accessibilityHint="Double tap to reset your password"
                    >
                        <Text style={styles.linkText}>Forgot password?</Text>
                    </TouchableOpacity>

                    {/* Create Account Link */}
                    <TouchableOpacity
                        onPress={handleRegister}
                        style={styles.linkContainer}
                        accessibilityRole="button"
                        accessibilityLabel="Create account"
                        accessibilityHint="Double tap to create a new account"
                    >
                        <Text style={styles.linkText}>Don't have an account? Create one</Text>
                    </TouchableOpacity>
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
        marginBottom: 32,
    },
    alert: {
        marginBottom: 16,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        paddingVertical: 8,
    },
    checkboxText: {
        fontSize: 16,
        color: '#000',
    },
    loginButton: {
        width: '100%',
        marginBottom: 16,
    },
    linkContainer: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    linkText: {
        fontSize: 16,
        color: '#007AFF',
        textDecorationLine: 'underline',
    },
});

export default LoginScreen;

