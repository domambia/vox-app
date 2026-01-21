import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import { AccessibleInput } from '../../components/accessible/AccessibleInput';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { AccessibleAlert } from '../../components/accessible/AccessibleAlert';
import { announceStepProgress, announceFieldError } from '../../services/accessibility/accessibilityUtils';
import { isValidPhoneNumber, isValidEmail, validatePassword, passwordsMatch } from '../../utils/validation';

type RegisterStepOneNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'RegisterStepOne'>;

interface Props {
    navigation: RegisterStepOneNavigationProp;
}

const RegisterStepOneScreen: React.FC<Props> = ({ navigation }) => {
    const [phoneNumberOrEmail, setPhoneNumberOrEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<{
        phoneNumberOrEmail?: string;
        password?: string;
        confirmPassword?: string;
    }>({});

    useEffect(() => {
        announceStepProgress(1, 3, 'Account information');
    }, []);

    const validateForm = (): boolean => {
        const newErrors: typeof errors = {};

        if (!phoneNumberOrEmail.trim()) {
            newErrors.phoneNumberOrEmail = 'Phone number or email is required';
        } else if (!isValidPhoneNumber(phoneNumberOrEmail) && !isValidEmail(phoneNumberOrEmail)) {
            newErrors.phoneNumberOrEmail = 'Please enter a valid phone number or email address';
        }

        if (!password) {
            newErrors.password = 'Password is required';
        } else {
            const passwordError = validatePassword(password);
            if (passwordError) {
                newErrors.password = passwordError;
            }
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (!passwordsMatch(password, confirmPassword)) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (!validateForm()) {
            return;
        }

        // Extract country code from phone number if it's a phone number
        let countryCode = '';
        if (isValidPhoneNumber(phoneNumberOrEmail)) {
            // Simple extraction - in production, use a proper phone number library
            if (phoneNumberOrEmail.startsWith('+')) {
                const match = phoneNumberOrEmail.match(/^\+(\d{1,3})/);
                countryCode = match ? match[1] : '';
            }
        }

        navigation.navigate('RegisterStepTwo', {
            phoneNumber: phoneNumberOrEmail,
            password,
            countryCode: countryCode || 'US', // Default to US if not detected
        });
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
                        accessibilityLabel="Step 1 of 3. Account information."
                    >
                        Create Account
                    </Text>

                    <Text
                        style={styles.stepIndicator}
                        accessibilityRole="text"
                    >
                        Step 1 of 3: Account Information
                    </Text>

                    <AccessibleInput
                        label="Phone number or email address"
                        value={phoneNumberOrEmail}
                        onChangeText={(text) => {
                            setPhoneNumberOrEmail(text);
                            if (errors.phoneNumberOrEmail) {
                                setErrors({ ...errors, phoneNumberOrEmail: undefined });
                            }
                        }}
                        hint="Enter your phone number or email address"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        error={errors.phoneNumberOrEmail}
                        required
                        autoFocus
                    />

                    <AccessibleInput
                        label="Password"
                        value={password}
                        onChangeText={(text) => {
                            setPassword(text);
                            if (errors.password) {
                                setErrors({ ...errors, password: undefined });
                            }
                        }}
                        hint="Enter a password with at least 8 characters, one uppercase, one lowercase, and one number"
                        secureTextEntry={!showPassword}
                        autoComplete="password-new"
                        error={errors.password}
                        required
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
                        label="Confirm password"
                        value={confirmPassword}
                        onChangeText={(text) => {
                            setConfirmPassword(text);
                            if (errors.confirmPassword) {
                                setErrors({ ...errors, confirmPassword: undefined });
                            }
                        }}
                        hint="Re-enter your password to confirm"
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
                        label="Next"
                        onPress={handleNext}
                        hint="Double tap to continue to step 2"
                        style={styles.nextButton}
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
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
    },
    stepIndicator: {
        fontSize: 16,
        color: '#666',
        marginBottom: 32,
    },
    checkboxContainer: {
        marginBottom: 16,
        paddingVertical: 8,
    },
    checkboxText: {
        fontSize: 16,
        color: '#000',
    },
    nextButton: {
        width: '100%',
        marginTop: 24,
    },
});

export default RegisterStepOneScreen;

