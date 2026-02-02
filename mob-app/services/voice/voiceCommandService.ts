import { Platform } from 'react-native';
import { announceToScreenReader } from '../accessibility/accessibilityUtils';
import { hapticService } from '../accessibility/hapticService';

// Conditionally import react-native-voice (not available in Expo Go)
let Voice: any = null;
try {
  Voice = require('react-native-voice').default;
} catch (error) {
  // react-native-voice not available (e.g., in Expo Go)
  console.log('react-native-voice not available, using fallback');
}

export type VoiceCommandAction = 
  | 'navigate'
  | 'go_back'
  | 'open_profile'
  | 'open_messages'
  | 'open_discover'
  | 'open_events'
  | 'open_groups'
  | 'send_message'
  | 'like_profile'
  | 'pass_profile'
  | 'super_like'
  | 'search'
  | 'filter'
  | 'refresh'
  | 'help'
  | 'settings';

export interface VoiceCommand {
  id: string;
  keywords: string[];
  action: VoiceCommandAction;
  description: string;
  params?: Record<string, any>;
}

export interface VoiceCommandResult {
  success: boolean;
  action?: VoiceCommandAction;
  confidence?: number;
  message?: string;
  params?: Record<string, any>;
}

/**
 * Voice Command Service
 * Handles voice commands for hands-free navigation and interaction
 */
class VoiceCommandService {
  private isListening: boolean = false;
  private commands: VoiceCommand[] = [];
  private onCommandHandlers: Map<VoiceCommandAction, (params?: any) => void> = new Map();
  private recognition: any = null; // SpeechRecognition instance

  constructor() {
    this.initializeCommands();
    this.setupVoiceRecognition();
  }

  /**
   * Setup voice recognition based on platform
   */
  private setupVoiceRecognition(): void {
    if (Platform.OS !== 'web' && Voice) {
      // React Native - use react-native-voice (if available)
      Voice.onSpeechStart = () => {
        console.log('Voice recognition started');
      };

      Voice.onSpeechEnd = () => {
        console.log('Voice recognition ended');
      };

      Voice.onSpeechError = (e: any) => {
        console.error('Voice recognition error:', e);
        announceToScreenReader('Voice command error. Please try again.', { isAlert: true });
      };

      Voice.onSpeechResults = (e: any) => {
        if (e.value && e.value.length > 0) {
          const transcript = e.value[0].toLowerCase().trim();
          this.processCommand(transcript);
        }
      };

      Voice.onSpeechPartialResults = (e: any) => {
        // Handle partial results if needed
      };
    }
  }

  /**
   * Check if native voice recognition is available
   */
  isNativeVoiceAvailable(): boolean {
    return Voice !== null && Platform.OS !== 'web';
  }

  /**
   * Initialize default voice commands
   */
  private initializeCommands(): void {
    this.commands = [
      // Navigation commands
      {
        id: 'navigate_discover',
        keywords: ['discover', 'find', 'browse', 'explore', 'search people'],
        action: 'open_discover',
        description: 'Navigate to discover screen',
      },
      {
        id: 'navigate_messages',
        keywords: ['messages', 'chats', 'conversations', 'inbox'],
        action: 'open_messages',
        description: 'Navigate to messages screen',
      },
      {
        id: 'navigate_events',
        keywords: ['events', 'calendar', 'activities', 'meetups'],
        action: 'open_events',
        description: 'Navigate to events screen',
      },
      {
        id: 'navigate_groups',
        keywords: ['groups', 'communities', 'clubs'],
        action: 'open_groups',
        description: 'Navigate to groups screen',
      },
      {
        id: 'navigate_profile',
        keywords: ['profile', 'my profile', 'account', 'settings'],
        action: 'open_profile',
        description: 'Navigate to profile screen',
      },
      {
        id: 'go_back',
        keywords: ['back', 'go back', 'return', 'previous'],
        action: 'go_back',
        description: 'Go back to previous screen',
      },
      // Action commands
      {
        id: 'like',
        keywords: ['like', 'yes', 'interested', 'match'],
        action: 'like_profile',
        description: 'Like current profile',
      },
      {
        id: 'pass',
        keywords: ['pass', 'skip', 'next', 'no', 'not interested'],
        action: 'pass_profile',
        description: 'Pass on current profile',
      },
      {
        id: 'super_like',
        keywords: ['super like', 'star', 'favorite', 'superlike'],
        action: 'super_like',
        description: 'Super like current profile',
      },
      {
        id: 'send_message',
        keywords: ['send message', 'message', 'reply', 'chat'],
        action: 'send_message',
        description: 'Send a message',
      },
      {
        id: 'search',
        keywords: ['search', 'find', 'look for'],
        action: 'search',
        description: 'Open search',
      },
      {
        id: 'filter',
        keywords: ['filter', 'filters', 'filter options'],
        action: 'filter',
        description: 'Open filters',
      },
      {
        id: 'refresh',
        keywords: ['refresh', 'reload', 'update'],
        action: 'refresh',
        description: 'Refresh current screen',
      },
      {
        id: 'help',
        keywords: ['help', 'what can I say', 'commands', 'voice commands'],
        action: 'help',
        description: 'Show available voice commands',
      },
    ];
  }

  /**
   * Register a handler for a specific command action
   */
  onCommand(action: VoiceCommandAction, handler: (params?: any) => void): () => void {
    this.onCommandHandlers.set(action, handler);
    
    // Return unsubscribe function
    return () => {
      this.onCommandHandlers.delete(action);
    };
  }

  /**
   * Start listening for voice commands
   */
  async startListening(): Promise<boolean> {
    if (this.isListening) {
      return true;
    }

    try {
      if (Platform.OS === 'web') {
        // Browser-based speech recognition
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
          const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
          this.recognition = new SpeechRecognition();
          this.recognition.continuous = true;
          this.recognition.interimResults = false;
          this.recognition.lang = 'en-US';

          this.recognition.onresult = (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
            this.processCommand(transcript);
          };

          this.recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            announceToScreenReader('Voice command error. Please try again.', { isAlert: true });
          };

          this.recognition.onend = () => {
            if (this.isListening) {
              this.recognition.start();
            }
          };

          this.recognition.start();
          this.isListening = true;
          await announceToScreenReader('Voice commands enabled. Say "help" to see available commands.');
          await hapticService.success();
          return true;
        } else {
          await announceToScreenReader('Voice commands not available on this browser.', { isAlert: true });
          return false;
        }
      } else {
        // React Native - use react-native-voice (if available)
        if (Voice) {
          try {
            await Voice.start('en-US');
            this.isListening = true;
            await announceToScreenReader('Voice commands enabled. Say "help" to see available commands.');
            await hapticService.success();
            return true;
          } catch (error: any) {
            console.error('Error starting voice recognition:', error);
            if (error.code === 'E_PERMISSION_DENIED') {
              await announceToScreenReader('Microphone permission is required for voice commands.', { isAlert: true });
            } else {
              await announceToScreenReader('Failed to start voice commands.', { isAlert: true });
            }
            return false;
          }
        } else {
          // Fallback: Manual command input mode for Expo Go
          await announceToScreenReader(
            'Voice recognition not available in Expo Go. Use manual command input or create a development build. Tap the help button to see available commands.',
            { isAlert: true }
          );
          // Still set listening to true for manual command mode
          this.isListening = true;
          return true;
        }
      }
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      await announceToScreenReader('Failed to start voice commands.', { isAlert: true });
      return false;
    }
  }

  /**
   * Stop listening for voice commands
   */
  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      if (Platform.OS === 'web' && this.recognition) {
        this.recognition.stop();
        this.recognition = null;
      } else if (Platform.OS !== 'web' && Voice) {
        try {
          await Voice.stop();
        } catch (error) {
          console.error('Error stopping voice recognition:', error);
        }
      }
      this.isListening = false;
      await announceToScreenReader('Voice commands disabled');
      await hapticService.light();
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  }

  /**
   * Process a voice command transcript
   */
  private async processCommand(transcript: string): Promise<void> {
    const normalizedTranscript = transcript.toLowerCase().trim();
    
    // Find matching command
    let bestMatch: VoiceCommand | null = null;
    let bestScore = 0;

    for (const command of this.commands) {
      for (const keyword of command.keywords) {
        if (normalizedTranscript.includes(keyword.toLowerCase())) {
          const score = keyword.length / normalizedTranscript.length;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = command;
          }
        }
      }
    }

    if (bestMatch && bestScore > 0.3) {
      await hapticService.medium();
      await announceToScreenReader(`Command recognized: ${bestMatch.description}`);
      
      const handler = this.onCommandHandlers.get(bestMatch.action);
      if (handler) {
        handler(bestMatch.params);
      } else {
        await announceToScreenReader(`Command "${bestMatch.description}" not handled`, { isAlert: true });
      }
    } else {
      // Try to provide helpful feedback
      if (normalizedTranscript.includes('help') || normalizedTranscript.includes('commands')) {
        await this.showAvailableCommands();
      } else {
        await announceToScreenReader('Command not recognized. Say "help" to see available commands.');
      }
    }
  }

  /**
   * Manually process a command (for testing or programmatic use)
   */
  async processManualCommand(command: string): Promise<VoiceCommandResult> {
    const normalizedCommand = command.toLowerCase().trim();
    
    for (const cmd of this.commands) {
      for (const keyword of cmd.keywords) {
        if (normalizedCommand.includes(keyword.toLowerCase())) {
          await hapticService.medium();
          await announceToScreenReader(`Executing: ${cmd.description}`);
          
          const handler = this.onCommandHandlers.get(cmd.action);
          if (handler) {
            handler(cmd.params);
            return {
              success: true,
              action: cmd.action,
              confidence: 0.8,
              message: cmd.description,
              params: cmd.params,
            };
          }
        }
      }
    }

    return {
      success: false,
      message: 'Command not recognized',
    };
  }

  /**
   * Show available voice commands
   */
  async showAvailableCommands(): Promise<void> {
    const commandList = this.commands
      .map((cmd) => `• ${cmd.keywords[0]}: ${cmd.description}`)
      .join('\n');
    
    await announceToScreenReader(
      `Available voice commands: ${commandList}`,
      { isAlert: true }
    );
  }

  /**
   * Get list of available commands
   */
  getAvailableCommands(): VoiceCommand[] {
    return [...this.commands];
  }

  /**
   * Check if voice commands are currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Add a custom command
   */
  addCommand(command: VoiceCommand): void {
    this.commands.push(command);
  }

  /**
   * Remove a command
   */
  removeCommand(commandId: string): void {
    this.commands = this.commands.filter((cmd) => cmd.id !== commandId);
  }
}

export const voiceCommandService = new VoiceCommandService();

