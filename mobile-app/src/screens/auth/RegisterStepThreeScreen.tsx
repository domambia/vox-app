import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { AccessibleAlert } from '../../components/accessible/AccessibleAlert';
import { useAppDispatch } from '../../hooks/redux';
import { register } from '../../store/slices/authSlice';
import { announceStepProgress, announceLoading } from '../../services/accessibility/accessibilityUtils';

type RegisterStepThreeNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'RegisterStepThree'>;
type RegisterStepThreeRouteProp = RouteProp<AuthStackParamList, 'RegisterStepThree'>;

interface Props {
    navigation: RegisterStepThreeNavigationProp;
    route: RegisterStepThreeRouteProp;
}

const RegisterStepThreeScreen: React.FC<Props> = ({ navigation, route }) => {
    const dispatch = useAppDispatch();
    const { phoneNumber, password, countryCode, firstName, lastName, email } = route.params;

    const [enableVoiceGuidance, setEnableVoiceGuidance] = useState(true);
    const [enableAudioConfirmations, setEnableAudioConfirmations] = useState(true);
    const [enableVibration, setEnableVibration] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        announceStepProgress(3, 3, 'Accessibility preferences');
    }, []);

    const handleComplete = async () => {
        setIsSubmitting(true);
        announceLoading('Creating account');

        try {
            await dispatch(register({
                phoneNumber,
                password,
                firstName,
                lastName,
                email,
                countryCode,
            })).unwrap();

            // Registration successful - navigation will happen automatically via AppNavigator
        } catch (error) {
            // Error is handled in the slice
        } finally {
            setIsSubmitting(false);
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
                        accessibilityLabel="Step 3 of 3. Accessibility preferences."
                    >
                        Accessibility Preferences
                    </Text>

                    <Text
                        style={styles.stepIndicator}
                        accessibilityRole="text"
                    >
                        Step 3 of 3: Accessibility Settings
                    </Text>

                    <Text
                        style={styles.description}
                        accessibilityRole="text"
                    >
                        Configure how VOX works for you. You can change these settings later.
                    </Text>

                    {/* Voice Guidance Toggle */}
                    <TouchableOpacity
                        style={styles.toggleContainer}
                        onPress={() => setEnableVoiceGuidance(!enableVoiceGuidance)}
                        accessibilityRole="checkbox"
                        accessibilityLabel="Enable voice guidance"
                        accessibilityState={{ checked: enableVoiceGuidance }}
                        accessibilityHint="Double tap to toggle voice guidance"
                    >
                        <Text style={styles.toggleText}>
                            {enableVoiceGuidance ? '✓' : '☐'} Enable voice guidance
                        </Text>
                        <Text style={styles.toggleDescription}>
                            VOX will guide you with voice prompts
                        </Text>
                    </TouchableOpacity>

                    {/* Audio Confirmations Toggle */}
                    <TouchableOpacity
                        style={styles.toggleContainer}
                        onPress={() => setEnableAudioConfirmations(!enableAudioConfirmations)}
                        accessibilityRole="checkbox"
                        accessibilityLabel="Enable audio confirmations"
                        accessibilityState={{ checked: enableAudioConfirmations }}
                        accessibilityHint="Double tap to toggle audio confirmations"
                    >
                        <Text style={styles.toggleText}>
                            {enableAudioConfirmations ? '✓' : '☐'} Enable audio confirmations
                        </Text>
                        <Text style={styles.toggleDescription}>
                            Hear confirmations for actions
                        </Text>
                    </TouchableOpacity>

                    {/* Vibration Toggle */}
                    <TouchableOpacity
                        style={styles.toggleContainer}
                        onPress={() => setEnableVibration(!enableVibration)}
                        accessibilityRole="checkbox"
                        accessibilityLabel="Enable vibration feedback"
                        accessibilityState={{ checked: enableVibration }}
                        accessibilityHint="Double tap to toggle vibration feedback"
                    >
                        <Text style={styles.toggleText}>
                            {enableVibration ? '✓' : '☐'} Enable vibration feedback
                        </Text>
                        <Text style={styles.toggleDescription}>
                            Feel vibrations for important actions
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.buttonContainer}>
                        <AccessibleButton
                            label="Back"
                            onPress={() => navigation.goBack()}
                            hint="Double tap to go back to previous step"
                            variant="secondary"
                            style={styles.backButton}
                        />

                        <AccessibleButton
                            label="Create Account"
                            onPress={handleComplete}
                            hint="Double tap to create your account"
                            loading={isSubmitting}
                            disabled={isSubmitting}
                            style={styles.completeButton}
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
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        color: '#666',
        marginBottom: 32,
    },
    toggleContainer: {
        paddingVertical: 16,
        paddingHorizontal: 12,
        marginBottom: 16,
        backgroundColor: '#F9F9F9',
        borderRadius: 8,
    },
    toggleText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    toggleDescription: {
        fontSize: 14,
        color: '#666',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    backButton: {
        flex: 1,
    },
    completeButton: {
        flex: 1,
    },
});

export default RegisterStepThreeScreen;

