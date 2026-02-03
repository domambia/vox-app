import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Accessibility utilities for voice-first design in LiamApp
 * All functions prioritize screen reader users and provide voice feedback
 */

/**
 * Announces a message to screen readers using both programmatic announcement
 * and alert role (for persistent display)
 */
export const announceToScreenReader = async (
  message: string,
  options: {
    isAlert?: boolean;
    priority?: 'low' | 'normal' | 'high';
  } = {}
): Promise<void> => {
  const { isAlert = false, priority = 'normal' } = options;

  try {
    // Method 1: Programmatic announcement for immediate speech
    await AccessibilityInfo.announceForAccessibility(message);

    // Method 2: Log for debugging (optional)
    if (__DEV__) {
      console.log(`[Accessibility] Announced: ${message}`);
    }
  } catch (error) {
    console.warn('[Accessibility] Announcement failed:', error);
  }
};

/**
 * Announces screen transitions with proper timing
 */
export const announceNavigation = async (
  destination: string,
  delay: number = 300
): Promise<void> => {
  const message = `Navigating to ${destination}`;

  // Small delay to ensure screen reader hears the announcement
  // before navigation actually happens
  setTimeout(() => {
    announceToScreenReader(message);
  }, delay);
};

/**
 * Announces form validation errors with field focus
 */
export const announceValidationError = async (
  fieldName: string,
  errorMessage: string,
  focusRef?: any
): Promise<void> => {
  const message = `${fieldName}: ${errorMessage}`;

  // Focus on error field first
  if (focusRef?.current) {
    focusRef.current.focus();
    // Small delay before announcing error
    setTimeout(() => {
      announceToScreenReader(message, { isAlert: true });
    }, 100);
  } else {
    await announceToScreenReader(message, { isAlert: true });
  }
};

/**
 * Announces loading states
 */
export const announceLoading = async (
  action: string,
  isComplete: boolean = false
): Promise<void> => {
  const message = isComplete
    ? `${action} completed.`
    : `${action} in progress. Please wait.`;

  await announceToScreenReader(message);
};

/**
 * Announces success states
 */
export const announceSuccess = async (
  action: string,
  details?: string
): Promise<void> => {
  const message = `Success: ${action}${details ? `. ${details}` : ''}`;
  await announceToScreenReader(message, { isAlert: true });
};

/**
 * Announces errors with proper error handling
 */
export const announceError = async (
  error: string,
  isCritical: boolean = false
): Promise<void> => {
  const message = `Error: ${error}`;
  await announceToScreenReader(message, { isAlert: isCritical });
};

/**
 * Announces step progress in multi-step flows
 */
export const announceStepProgress = async (
  currentStep: number,
  totalSteps: number,
  stepName?: string
): Promise<void> => {
  const message = `Step ${currentStep} of ${totalSteps}${stepName ? `. ${stepName}` : ''}`;
  await announceToScreenReader(message);
};

/**
 * Announces network status changes
 */
export const announceNetworkStatus = async (
  isOnline: boolean,
  details?: string
): Promise<void> => {
  const status = isOnline ? 'online' : 'offline';
  const message = `You are now ${status}${details ? `. ${details}` : ''}`;
  await announceToScreenReader(message, { isAlert: !isOnline });
};

/**
 * Formats dates for screen reader accessibility
 */
export const formatDateForScreenReader = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Use a readable format that screen readers can announce clearly
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

/**
 * Formats numbers for screen reader accessibility
 */
export const formatNumberForScreenReader = (num: number): string => {
  // For now, just return the number as string
  // In a real app, you might want to implement number-to-words conversion
  return num.toString();
};

/**
 * Checks if screen reader is enabled
 */
export const isScreenReaderEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch {
    return false;
  }
};

/**
 * Gets recommended timeout for screen reader announcements
 */
export const getScreenReaderTimeout = async (): Promise<number> => {
  const enabled = await isScreenReaderEnabled();
  // Give more time for screen readers to process announcements
  return enabled ? 1000 : 500;
};

/**
 * Creates accessible focus management
 */
export class FocusManager {
  private static instance: FocusManager;
  private focusHistory: any[] = [];

  static getInstance(): FocusManager {
    if (!FocusManager.instance) {
      FocusManager.instance = new FocusManager();
    }
    return FocusManager.instance;
  }

  /**
   * Sets focus on an element with accessibility announcement
   */
  async setFocus(ref: any, label?: string): Promise<void> {
    if (ref?.current) {
      ref.current.focus();

      if (label) {
        setTimeout(() => {
          announceToScreenReader(`Focused on ${label}`);
        }, 100);
      }

      this.focusHistory.push(ref);
    }
  }

  /**
   * Returns focus to the previous element
   */
  async returnFocus(): Promise<void> {
    if (this.focusHistory.length > 1) {
      this.focusHistory.pop(); // Remove current
      const previousRef = this.focusHistory[this.focusHistory.length - 1];

      if (previousRef?.current) {
        previousRef.current.focus();
        setTimeout(() => {
          announceToScreenReader('Focus returned');
        }, 100);
      }
    }
  }
}

export const focusManager = FocusManager.getInstance();
