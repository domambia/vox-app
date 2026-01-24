import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { voiceCommandService, VoiceCommandAction } from '../services/voice/voiceCommandService';
import { announceToScreenReader } from '../services/accessibility/accessibilityUtils';
import { hapticService } from '../services/accessibility/hapticService';

/**
 * Hook for integrating voice commands into screens
 * Handles navigation and common actions
 */
export const useVoiceCommands = (screenName?: string) => {
  const navigation = useNavigation();
  const handlersRef = useRef<Map<VoiceCommandAction, () => void>>(new Map());

  useEffect(() => {
    // Register command handlers
    const handlers = new Map<VoiceCommandAction, () => void>();

    // Navigation commands
    handlers.set('open_discover', () => {
      const rootNavigation = navigation.getParent()?.getParent();
      if (rootNavigation) {
        rootNavigation.dispatch(CommonActions.navigate('Discover'));
        announceToScreenReader('Navigating to discover');
      }
    });

    handlers.set('open_messages', () => {
      const rootNavigation = navigation.getParent()?.getParent();
      if (rootNavigation) {
        rootNavigation.dispatch(CommonActions.navigate('Messages'));
        announceToScreenReader('Navigating to messages');
      }
    });

    handlers.set('open_events', () => {
      const rootNavigation = navigation.getParent()?.getParent();
      if (rootNavigation) {
        rootNavigation.dispatch(CommonActions.navigate('Events'));
        announceToScreenReader('Navigating to events');
      }
    });

    handlers.set('open_groups', () => {
      const rootNavigation = navigation.getParent()?.getParent();
      if (rootNavigation) {
        rootNavigation.dispatch(CommonActions.navigate('Groups'));
        announceToScreenReader('Navigating to groups');
      }
    });

    handlers.set('open_profile', () => {
      const rootNavigation = navigation.getParent()?.getParent();
      if (rootNavigation) {
        rootNavigation.dispatch(CommonActions.navigate('Profile'));
        announceToScreenReader('Navigating to profile');
      }
    });

    handlers.set('go_back', () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        announceToScreenReader('Going back');
      } else {
        announceToScreenReader('Cannot go back', { isAlert: true });
      }
    });

    handlers.set('help', async () => {
      await voiceCommandService.showAvailableCommands();
    });

    handlers.set('refresh', () => {
      announceToScreenReader('Refresh command received. Implement refresh action in your screen.');
    });

    // Register all handlers
    const unsubscribes: (() => void)[] = [];
    handlers.forEach((handler, action) => {
      const unsubscribe = voiceCommandService.onCommand(action, handler);
      unsubscribes.push(unsubscribe);
    });

    handlersRef.current = handlers;

    // Cleanup on unmount
    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [navigation]);

  /**
   * Register a custom command handler for this screen
   */
  const registerCommand = (action: VoiceCommandAction, handler: () => void) => {
    const unsubscribe = voiceCommandService.onCommand(action, handler);
    handlersRef.current.set(action, handler);
    return unsubscribe;
  };

  /**
   * Get current listening state
   */
  const isListening = voiceCommandService.getIsListening();

  return {
    isListening,
    registerCommand,
  };
};

