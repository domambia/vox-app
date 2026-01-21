import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import { AccessibleInput } from '../../components/accessible/AccessibleInput';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { announceStepProgress } from '../../services/accessibility/accessibilityUtils';
import { validateName, validateBio } from '../../utils/validation';

type RegisterStepTwoNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'RegisterStepTwo'>;
type RegisterStepTwoRouteProp = RouteProp<AuthStackParamList, 'RegisterStepTwo'>;

interface Props {
    navigation: RegisterStepTwoNavigationProp;
    route: RegisterStepTwoRouteProp;
}

const RegisterStepTwoScreen: React.FC<Props> = ({ navigation, route }) => {
    const { phoneNumber, password, countryCode } = route.params;

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [bio, setBio] = useState('');
    const [errors, setErrors] = useState<{
        firstName?: string;
        lastName?: string;
        email?: string;
        bio?: string;
    }>({});

    useEffect(() => {
        announceStepProgress(2, 3, 'Profile information');
    }, []);

    const validateForm = (): boolean => {
        const newErrors: typeof errors = {};

        const firstNameError = validateName(firstName);
        if (firstNameError) {
            newErrors.firstName = firstNameError;
        }

        const lastNameError = validateName(lastName);
        if (lastNameError) {
            newErrors.lastName = lastNameError;
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        const bioError = validateBio(bio);
        if (bioError) {
            newErrors.bio = bioError;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (!validateForm()) {
            return;
        }

        navigation.navigate('RegisterStepThree', {
            phoneNumber,
            password,
            countryCode,
            firstName,
            lastName,
            email: email || undefined,
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
                        accessibilityLabel="Step 2 of 3. Profile information."
                    >
                        Profile Information
                    </Text>

                    <Text
                        style={styles.stepIndicator}
                        accessibilityRole="text"
                    >
                        Step 2 of 3: Profile Basics
                    </Text>

                    <AccessibleInput
                        label="First name"
                        value={firstName}
                        onChangeText={(text) => {
                            setFirstName(text);
                            if (errors.firstName) {
                                setErrors({ ...errors, firstName: undefined });
                            }
                        }}
                        hint="Enter your first name"
                        autoCapitalize="words"
                        autoComplete="given-name"
                        error={errors.firstName}
                        required
                        autoFocus
                    />

                    <AccessibleInput
                        label="Last name"
                        value={lastName}
                        onChangeText={(text) => {
                            setLastName(text);
                            if (errors.lastName) {
                                setErrors({ ...errors, lastName: undefined });
                            }
                        }}
                        hint="Enter your last name"
                        autoCapitalize="words"
                        autoComplete="family-name"
                        error={errors.lastName}
                        required
                    />

                    <AccessibleInput
                        label="Email address (optional)"
                        value={email}
                        onChangeText={(text) => {
                            setEmail(text);
                            if (errors.email) {
                                setErrors({ ...errors, email: undefined });
                            }
                        }}
                        hint="Enter your email address (optional)"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        error={errors.email}
                    />

                    <AccessibleInput
                        label="Bio (optional)"
                        value={bio}
                        onChangeText={(text) => {
                            setBio(text);
                            if (errors.bio) {
                                setErrors({ ...errors, bio: undefined });
                            }
                        }}
                        hint="Tell us about yourself (optional)"
                        multiline
                        numberOfLines={4}
                        error={errors.bio}
                    />

                    <View style={styles.buttonContainer}>
                        <AccessibleButton
                            label="Back"
                            onPress={() => navigation.goBack()}
                            hint="Double tap to go back to previous step"
                            variant="secondary"
                            style={styles.backButton}
                        />

                        <AccessibleButton
                            label="Next"
                            onPress={handleNext}
                            hint="Double tap to continue to step 3"
                            style={styles.nextButton}
                        />
                    </View>
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
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    backButton: {
        flex: 1,
    },
    nextButton: {
        flex: 1,
    },
});

export default RegisterStepTwoScreen;

