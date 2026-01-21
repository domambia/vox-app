import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { ACCESSIBILITY } from '../../utils/constants';

interface AccessibleButtonProps {
    label: string;
    onPress: () => void;
    hint?: string;
    disabled?: boolean;
    loading?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
    style?: ViewStyle;
    textStyle?: TextStyle;
    accessibilityRole?: 'button' | 'link' | 'none';
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
    label,
    onPress,
    hint,
    disabled = false,
    loading = false,
    variant = 'primary',
    style,
    textStyle,
    accessibilityRole = 'button',
}) => {
    const buttonStyle = [
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        style,
    ];

    const buttonTextStyle = [
        styles.buttonText,
        styles[`${variant}Text`],
        disabled && styles.disabledText,
        textStyle,
    ];

    return (
        <TouchableOpacity
            style={buttonStyle}
            onPress={onPress}
            disabled={disabled || loading}
            accessibilityRole={accessibilityRole}
            accessibilityLabel={label}
            accessibilityHint={hint || `Double tap to ${label.toLowerCase()}`}
            accessibilityState={{ disabled: disabled || loading }}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : '#007AFF'} />
            ) : (
                <Text style={buttonTextStyle}>{label}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        minHeight: ACCESSIBILITY.MIN_TOUCH_TARGET,
        minWidth: ACCESSIBILITY.MIN_TOUCH_TARGET,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primary: {
        backgroundColor: '#007AFF',
    },
    secondary: {
        backgroundColor: '#F2F2F7',
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    danger: {
        backgroundColor: '#FF3B30',
    },
    disabled: {
        opacity: 0.5,
    },
    buttonText: {
        fontSize: ACCESSIBILITY.PREFERRED_FONT_SIZE,
        fontWeight: '600',
        textAlign: 'center',
    },
    primaryText: {
        color: '#FFFFFF',
    },
    secondaryText: {
        color: '#007AFF',
    },
    dangerText: {
        color: '#FFFFFF',
    },
    disabledText: {
        opacity: 0.6,
    },
});

