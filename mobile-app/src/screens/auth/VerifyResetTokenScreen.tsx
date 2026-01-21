import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import { AccessibleInput } from '../../components/accessible/AccessibleInput';
import { AccessibleButton } from '../../components/accessible/AccessibleButton';
import { AccessibleAlert } from '../../components/accessible/AccessibleAlert';
import { authApi } from '../../services/api/auth.api';
import { announceScreenTitle, announceError } from '../../services/accessibility/accessibilityUtils';

type VerifyResetTokenScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'VerifyResetToken'>;
type VerifyResetTokenScreenRouteProp = RouteProp<AuthStackParamList, 'VerifyResetToken'>;

interface Props {
    navigation: VerifyResetTokenScreenNavigationProp;
    route: VerifyResetTokenScreenRouteProp;
}

const VerifyResetTokenScreen: React.FC<Props> = ({ navigation, route }) => {
    const { phoneNumber } = route.params;
    const [token, setToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        announceScreenTitle('Verify reset token');
    }, []);

    const handleVerify = async () => {
        if (!token.trim()) {
            setError('Verification token is required');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await authApi.verifyPasswordReset({ token });
            navigation.navigate('CompletePasswordReset', { phoneNumber, token });
        } catch (err: any) {
            const errorMessage = err.response?.data?.error?.message || err.message || 'Invalid verification token';
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
                        accessibilityLabel="Verify reset token"
                    >
                        Verify Token
                    </Text>

                    <Text
                        style={styles.description}
                        accessibilityRole="text"
                    >
                        Enter the verification token sent to your email or phone.
                    </Text>

                    {error && (
                        <AccessibleAlert
                            message={error}
                            type="error"
                            style={styles.alert}
                        />
                    )}

                    <AccessibleInput
                        label="Verification token"
                        value={token}
                        onChangeText={(text) => {
                            setToken(text);
                            setError(null);
                        }}
                        hint="Enter the verification token"
                        keyboardType="default"
                        autoCapitalize="none"
                        error={error || undefined}
                        required
                        autoFocus
                    />

                    <AccessibleButton
                        label="Verify"
                        onPress={handleVerify}
                        hint="Double tap to verify the token"
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
    button: {
        width: '100%',
        marginBottom: 12,
    },
});

export default VerifyResetTokenScreen;

