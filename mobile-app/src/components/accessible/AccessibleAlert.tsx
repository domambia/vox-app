import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { announceError, announceSuccess } from '../../services/accessibility/accessibilityUtils';

interface AccessibleAlertProps {
    message: string;
    type?: 'error' | 'success' | 'info';
    style?: ViewStyle;
    textStyle?: TextStyle;
    autoAnnounce?: boolean;
}

export const AccessibleAlert: React.FC<AccessibleAlertProps> = ({
    message,
    type = 'info',
    style,
    textStyle,
    autoAnnounce = true,
}) => {
    useEffect(() => {
        if (autoAnnounce) {
            if (type === 'error') {
                announceError(message);
            } else if (type === 'success') {
                announceSuccess(message);
            }
        }
    }, [message, type, autoAnnounce]);

    const alertStyle = [
        styles.alert,
        styles[type],
        style,
    ];

    const alertTextStyle = [
        styles.alertText,
        styles[`${type}Text`],
        textStyle,
    ];

    return (
        <View
            style={alertStyle}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
        >
            <Text style={alertTextStyle}>{message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    alert: {
        padding: 16,
        borderRadius: 8,
        marginVertical: 8,
    },
    error: {
        backgroundColor: '#FFEBEE',
        borderLeftWidth: 4,
        borderLeftColor: '#FF3B30',
    },
    success: {
        backgroundColor: '#E8F5E9',
        borderLeftWidth: 4,
        borderLeftColor: '#34C759',
    },
    info: {
        backgroundColor: '#E3F2FD',
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF',
    },
    alertText: {
        fontSize: 16,
        fontWeight: '500',
    },
    errorText: {
        color: '#C62828',
    },
    successText: {
        color: '#2E7D32',
    },
    infoText: {
        color: '#1565C0',
    },
});

