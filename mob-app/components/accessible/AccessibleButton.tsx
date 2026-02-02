import React from 'react';
import {
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
  AccessibilityRole,
  TouchableOpacityProps,
} from 'react-native';
import { AppColors } from '../../constants/theme';
import { announceToScreenReader } from '../../services/accessibility/accessibilityUtils';
import { hapticService } from '../../services/accessibility/hapticService';

interface AccessibleButtonProps extends TouchableOpacityProps {
  title: string;
  onPress: () => void;
  accessibilityHint?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
}

/**
 * Accessible button component for VOX
 * Follows WCAG 2.2 AA guidelines and provides voice feedback
 */
export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  title,
  onPress,
  accessibilityHint,
  style,
  textStyle,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  ...props
}) => {
  // Determine accessibility role
  const accessibilityRole: AccessibilityRole = 'button';

  // Create accessibility label
  const accessibilityLabel = loading ? `${title}. Loading` : title;

  // Create accessibility hint
  const finalAccessibilityHint = loading
    ? 'Please wait'
    : accessibilityHint || `Double tap to ${title.toLowerCase()}`;

  // Handle press with voice feedback and haptics
  const handlePress = async () => {
    if (loading || disabled) return;

    try {
      // Haptic feedback on press
      await hapticService.light();

      // Announce action before executing
      await announceToScreenReader(`${title} activated`);

      // Execute the action
      onPress();

      // Haptic and announcement for critical actions
      if (title.toLowerCase().includes('submit') ||
        title.toLowerCase().includes('save') ||
        title.toLowerCase().includes('send')) {
        await hapticService.success();
        setTimeout(() => {
          announceToScreenReader(`${title} completed`);
        }, 500);
      }
    } catch (error) {
      await hapticService.error();
      await announceToScreenReader(`Error: ${title} failed`);
    }
  };

  // Button styles based on variant and size
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      minHeight: 48, // WCAG touch target minimum
      minWidth: 48,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      opacity: disabled || loading ? 0.6 : 1,
    };

    // Size variations
    switch (size) {
      case 'small':
        baseStyle.paddingHorizontal = 12;
        baseStyle.paddingVertical = 8;
        baseStyle.minHeight = 36;
        break;
      case 'large':
        baseStyle.paddingHorizontal = 24;
        baseStyle.paddingVertical = 16;
        baseStyle.minHeight = 56;
        break;
      default: // medium
        baseStyle.paddingHorizontal = 16;
        baseStyle.paddingVertical = 12;
        break;
    }

    // Variant styles (green, white, black theme)
    switch (variant) {
      case 'secondary':
        baseStyle.backgroundColor = AppColors.borderLight;
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = AppColors.border;
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 2;
        baseStyle.borderColor = AppColors.primary;
        break;
      default: // primary
        baseStyle.backgroundColor = AppColors.primary;
        break;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    };

    // Color based on variant (black text on white/gray, white on green)
    switch (variant) {
      case 'secondary':
        baseTextStyle.color = AppColors.text;
        break;
      case 'outline':
        baseTextStyle.color = AppColors.primary;
        break;
      default: // primary
        baseTextStyle.color = AppColors.white;
        break;
    }

    return baseTextStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={finalAccessibilityHint}
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
      }}
      {...props}
    >
      <Text style={[getTextStyle(), textStyle]}>
        {loading ? 'Loading...' : title}
      </Text>
    </TouchableOpacity>
  );
};
