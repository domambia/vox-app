import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic Feedback Service
 * Provides haptic feedback for better accessibility
 */
class HapticService {
  private enabled: boolean = true;

  /**
   * Enable or disable haptic feedback
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if haptics are enabled
   */
  isEnabled(): boolean {
    return this.enabled && Platform.OS !== 'web';
  }

  /**
   * Light impact feedback (for button presses)
   */
  async light(): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics not available, ignore
    }
  }

  /**
   * Medium impact feedback (for selections)
   */
  async medium(): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Haptics not available, ignore
    }
  }

  /**
   * Heavy impact feedback (for errors)
   */
  async heavy(): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      // Haptics not available, ignore
    }
  }

  /**
   * Success notification (for successful actions)
   */
  async success(): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      // Haptics not available, ignore
    }
  }

  /**
   * Warning notification (for warnings)
   */
  async warning(): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      // Haptics not available, ignore
    }
  }

  /**
   * Error notification (for errors)
   */
  async error(): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      // Haptics not available, ignore
    }
  }

  /**
   * Selection feedback (for picker selections)
   */
  async selection(): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      // Haptics not available, ignore
    }
  }
}

export const hapticService = new HapticService();

