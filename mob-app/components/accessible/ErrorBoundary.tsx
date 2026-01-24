import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AccessibleButton } from './AccessibleButton';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary Component
 * Catches React errors and displays accessible error UI
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        announceToScreenReader('An error occurred. Please try again.', { isAlert: true });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
        announceToScreenReader('Retrying...');
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <View style={styles.container} accessibilityRole="alert">
                    <Text style={styles.title} accessibilityRole="header">
                        Something went wrong
                    </Text>
                    <Text style={styles.message} accessibilityRole="text">
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </Text>
                    <AccessibleButton
                        title="Try Again"
                        onPress={this.handleRetry}
                        variant="primary"
                        accessibilityHint="Retry the previous action"
                        style={styles.retryButton}
                    />
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#FFFFFF',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#6C757D',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    retryButton: {
        minWidth: 120,
    },
});

