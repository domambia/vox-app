import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { AccessibleButton } from './AccessibleButton';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

interface ErrorViewProps {
    message?: string;
    onRetry?: () => void;
    retryLabel?: string;
}

/**
 * Error View Component
 * Displays user-friendly error messages with retry option
 */
export const ErrorView: React.FC<ErrorViewProps> = ({
    message = 'Something went wrong. Please try again.',
    onRetry,
    retryLabel = 'Try Again',
}) => {
    React.useEffect(() => {
        announceToScreenReader(`Error: ${message}`, { isAlert: true });
    }, [message]);

    return (
        <View style={styles.container} accessibilityRole="alert">
            <Ionicons name="alert-circle-outline" size={48} color={AppColors.error} />
            <Text style={styles.title} accessibilityRole="header">
                Error
            </Text>
            <Text style={styles.message} accessibilityRole="text">
                {message}
            </Text>
            {onRetry && (
                <AccessibleButton
                    title={retryLabel}
                    onPress={onRetry}
                    variant="primary"
                    accessibilityHint="Retry the previous action"
                    style={styles.retryButton}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: AppColors.background,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: AppColors.text,
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: AppColors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
        maxWidth: 300,
    },
    retryButton: {
        minWidth: 120,
    },
});

