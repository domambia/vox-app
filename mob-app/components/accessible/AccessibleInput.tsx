import React, { useRef, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  ViewStyle,
  TextStyle,
  StyleSheet,
  TextInput as RNTextInput,
} from 'react-native';
import { AppColors } from '../../constants/theme';
import { announceValidationError } from '../../services/accessibility/accessibilityUtils';

interface AccessibleInputProps extends TextInputProps {
  label: string; // REQUIRED: Never rely on placeholder alone
  accessibilityHint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  onValidationError?: (fieldName: string, error: string) => void;
}

/**
 * Accessible input component for LiamApp
 * CRITICAL: Always provides explicit labels, never relies on placeholders
 * Follows WCAG 2.2 AA guidelines for form accessibility
 */
export const AccessibleInput = forwardRef<RNTextInput, AccessibleInputProps>(
  (
    {
      label,
      accessibilityHint,
      error,
      required = false,
      disabled = false,
      value,
      onChangeText,
      onBlur,
      containerStyle,
      inputStyle,
      labelStyle,
      errorStyle,
      onValidationError,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<RNTextInput>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current!);

    // Handle validation error announcement
    React.useEffect(() => {
      if (error && onValidationError) {
        onValidationError(label, error);
      }
    }, [error, label, onValidationError]);

    // Create accessibility label
    const accessibilityLabel = `${label}${required ? ' (required)' : ''}${error ? `. Error: ${error}` : ''}`;

    // Create accessibility hint
    const finalAccessibilityHint = accessibilityHint ||
      `Enter your ${label.toLowerCase()}${required ? '. This field is required' : ''}`;

    // Handle input change with real-time validation feedback
    const handleChangeText = (text: string) => {
      if (onChangeText) {
        onChangeText(text);
      }

      // Clear error state when user starts typing
      if (error && text.length > 0) {
        // Error will be cleared by parent component
      }
    };

    // Handle blur with validation
    const handleBlur = (e: any) => {
      if (onBlur) {
        onBlur(e);
      }

      // Announce current value for confirmation
      if (value && value.length > 0) {
        setTimeout(() => {
          // Optional: announce value for user confirmation
        }, 100);
      }
    };

    return (
      <View style={[styles.container, containerStyle]}>
        {/* Explicit Label - NEVER JUST PLACEHOLDER */}
        <Text
          style={[styles.label, labelStyle]}
          accessibilityRole="text"
        >
          {label}
          {required && <Text style={styles.requiredAsterisk}> *</Text>}
        </Text>

        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            error && styles.inputError,
            inputStyle,
          ]}
          value={value}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={finalAccessibilityHint}
          accessibilityRole="text"
          accessibilityState={{
            disabled: disabled || false,
            selected: false,
            checked: undefined,
            busy: false,
            expanded: false,
          }}
          // Visual placeholder (secondary to accessibility label)
          placeholder={props.placeholder || `Enter ${label.toLowerCase()}`}
          placeholderTextColor={AppColors.placeholder}
          {...props}
        />

        {/* Error Message with Alert Role */}
        {error && (
          <Text
            style={[styles.error, errorStyle]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 8,
  },
  requiredAsterisk: {
    color: AppColors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: AppColors.background,
    color: AppColors.text,
    minHeight: 48,
  },
  inputError: {
    borderColor: AppColors.error,
    borderWidth: 2,
  },
  error: {
    fontSize: 14,
    color: AppColors.error,
    marginTop: 4,
    fontWeight: '500',
  },
});
