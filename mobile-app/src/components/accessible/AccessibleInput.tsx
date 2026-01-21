import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle, TextStyle, TextInputProps } from 'react-native';
import { ACCESSIBILITY } from '../../utils/constants';
import { announceFieldError } from '../../services/accessibility/accessibilityUtils';

interface AccessibleInputProps extends TextInputProps {
    label: string;
    hint?: string;
    error?: string;
    value: string;
    onChangeText: (text: string) => void;
    containerStyle?: ViewStyle;
    inputStyle?: TextStyle;
    labelStyle?: TextStyle;
    errorStyle?: TextStyle;
    required?: boolean;
    autoFocus?: boolean;
}

export const AccessibleInput: React.FC<AccessibleInputProps> = ({
    label,
    hint,
    error,
    value,
    onChangeText,
    containerStyle,
    inputStyle,
    labelStyle,
    errorStyle,
    required = false,
    autoFocus = false,
    ...textInputProps
}) => {
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (error) {
            announceFieldError(label, error);
            // Auto-focus on error field
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [error, label]);

    useEffect(() => {
        if (autoFocus) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 300);
        }
    }, [autoFocus]);

    return (
        <View style={[styles.container, containerStyle]}>
            {/* Explicit label - NEVER just placeholder */}
            <Text
                accessibilityRole="text"
                style={[styles.label, labelStyle]}
            >
                {label}
                {required && <Text style={styles.required}> *</Text>}
            </Text>

            <TextInput
                ref={inputRef}
                style={[
                    styles.input,
                    error && styles.inputError,
                    inputStyle,
                ]}
                value={value}
                onChangeText={onChangeText}
                accessibilityLabel={label}
                accessibilityHint={error ? `${hint || `Enter ${label.toLowerCase()}`}. Error: ${error}` : (hint || `Enter ${label.toLowerCase()}`)}
                accessibilityState={error ? { disabled: false } : undefined}
                placeholderTextColor="#999"
                {...textInputProps}
            />

            {/* Error message with alert role */}
            {error && (
                <Text
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                    style={[styles.error, errorStyle]}
                >
                    {error}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: ACCESSIBILITY.PREFERRED_FONT_SIZE,
        fontWeight: '600',
        color: '#000',
        marginBottom: 8,
    },
    required: {
        color: '#FF3B30',
    },
    input: {
        fontSize: ACCESSIBILITY.PREFERRED_FONT_SIZE,
        minHeight: ACCESSIBILITY.MIN_TOUCH_TARGET,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#D1D1D6',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        color: '#000',
    },
    inputError: {
        borderColor: '#FF3B30',
    },
    error: {
        fontSize: 14,
        color: '#FF3B30',
        marginTop: 4,
    },
});

