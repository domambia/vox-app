import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Announce message to screen reader using both methods for maximum compatibility
 * @param message - Message to announce
 * @param isAlert - Whether this is an alert (critical message)
 */
export const announceToScreenReader = (message: string, isAlert: boolean = false): void => {
  // Method 1: Programmatic announcement
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    AccessibilityInfo.announceForAccessibility(message);
  }

  // Method 2: For alerts, we'll also use accessibilityRole="alert" in the UI
  // This is handled in the component itself
};

/**
 * Check if screen reader is enabled
 */
export const isScreenReaderEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch {
    return false;
  }
};

/**
 * Announce screen title on load
 */
export const announceScreenTitle = (title: string): void => {
  announceToScreenReader(title);
};

/**
 * Announce error with alert role
 */
export const announceError = (error: string): void => {
  announceToScreenReader(`Error: ${error}`, true);
};

/**
 * Announce success message
 */
export const announceSuccess = (message: string): void => {
  announceToScreenReader(message);
};

/**
 * Announce loading state
 */
export const announceLoading = (action: string = 'Loading'): void => {
  announceToScreenReader(`${action}. Please wait.`);
};

/**
 * Announce navigation
 */
export const announceNavigation = (destination: string): void => {
  announceToScreenReader(`Navigating to ${destination}`);
};

/**
 * Announce step progress in multi-step flows
 */
export const announceStepProgress = (currentStep: number, totalSteps: number, stepName: string): void => {
  announceToScreenReader(`Step ${currentStep} of ${totalSteps}. ${stepName}.`);
};

/**
 * Announce network status
 */
export const announceNetworkStatus = (isOnline: boolean): void => {
  if (isOnline) {
    announceToScreenReader('Connection restored.');
  } else {
    announceToScreenReader('You are offline. Some features may not work.', true);
  }
};

/**
 * Announce validation error for a specific field
 */
export const announceFieldError = (fieldName: string, errorMessage: string): void => {
  announceToScreenReader(`${fieldName}: ${errorMessage}`, true);
};

/**
 * Format message for screen reader with context
 */
export const formatForScreenReader = (label: string, hint?: string, value?: string): string => {
  let result = label;
  if (value) {
    result += `, ${value}`;
  }
  if (hint) {
    result += `. ${hint}`;
  }
  return result;
};

