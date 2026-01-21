import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Screen reader utilities for advanced accessibility features
 */

export interface ScreenReaderConfig {
  enableVoiceGuidance: boolean;
  enableAudioConfirmations: boolean;
  enableVibration: boolean;
}

/**
 * Get default screen reader configuration
 */
export const getDefaultScreenReaderConfig = (): ScreenReaderConfig => ({
  enableVoiceGuidance: true,
  enableAudioConfirmations: true,
  enableVibration: Platform.OS === 'android',
});

/**
 * Check if accessibility services are available
 */
export const checkAccessibilitySupport = async (): Promise<{
  screenReader: boolean;
  reduceMotion: boolean;
  reduceTransparency: boolean;
}> => {
  try {
    const [screenReader, reduceMotion, reduceTransparency] = await Promise.all([
      AccessibilityInfo.isScreenReaderEnabled(),
      AccessibilityInfo.isReduceMotionEnabled(),
      AccessibilityInfo.isReduceTransparencyEnabled(),
    ]);

    return {
      screenReader,
      reduceMotion,
      reduceTransparency,
    };
  } catch {
    return {
      screenReader: false,
      reduceMotion: false,
      reduceTransparency: false,
    };
  }
};

/**
 * Set accessibility focus on an element
 * Note: This requires a ref to the element
 */
export const setAccessibilityFocus = (ref: React.RefObject<any>): void => {
  if (ref.current && Platform.OS === 'ios') {
    // iOS uses AccessibilityInfo.setAccessibilityFocus
    // This is typically handled via accessibilityFocus prop in React Native
    ref.current.focus?.();
  } else if (ref.current && Platform.OS === 'android') {
    // Android uses accessibility focus via ref
    ref.current.focus?.();
  }
};

