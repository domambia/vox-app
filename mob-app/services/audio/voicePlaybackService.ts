import { Audio } from 'expo-av';
import { announceToScreenReader } from '../accessibility/accessibilityUtils';

export interface PlaybackStatus {
  isPlaying: boolean;
  position: number; // in milliseconds
  duration: number; // in milliseconds
  isLoaded: boolean;
}

/**
 * Voice Playback Service
 * Handles audio playback for voice bios and voice messages
 */
class VoicePlaybackService {
  private sound: Audio.Sound | null = null;
  private statusUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private onStatusUpdate?: (status: PlaybackStatus) => void;

  /**
   * Load and play audio from URI
   */
  async play(uri: string, onStatusUpdate?: (status: PlaybackStatus) => void): Promise<boolean> {
    try {
      // Stop any existing playback
      await this.stop();

      // Create new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            if (onStatusUpdate) {
              onStatusUpdate({
                isPlaying: status.isPlaying || false,
                position: status.positionMillis || 0,
                duration: status.durationMillis || 0,
                isLoaded: true,
              });
            }

            // Announce when playback finishes
            if (status.didJustFinish) {
              announceToScreenReader('Playback finished');
            }
          }
        }
      );

      this.sound = sound;
      this.onStatusUpdate = onStatusUpdate;

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      await announceToScreenReader('Playing audio');
      return true;
    } catch (error) {
      console.error('Error playing audio:', error);
      await announceToScreenReader('Failed to play audio', { isAlert: true });
      return false;
    }
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.pauseAsync();
        await announceToScreenReader('Playback paused');
      }
    } catch (error) {
      console.error('Error pausing playback:', error);
    }
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.playAsync();
        await announceToScreenReader('Playback resumed');
      }
    } catch (error) {
      console.error('Error resuming playback:', error);
    }
  }

  /**
   * Stop playback
   */
  async stop(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
        this.onStatusUpdate = undefined;
        this.stopStatusUpdates();
        await announceToScreenReader('Playback stopped');
      }
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  }

  /**
   * Seek to position
   */
  async seekTo(positionMillis: number): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.setPositionAsync(positionMillis);
      }
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }

  /**
   * Get current playback status
   */
  async getStatus(): Promise<PlaybackStatus | null> {
    if (!this.sound) {
      return null;
    }

    try {
      const status = await this.sound.getStatusAsync();
      if (status.isLoaded) {
        return {
          isPlaying: status.isPlaying || false,
          position: status.positionMillis || 0,
          duration: status.durationMillis || 0,
          isLoaded: true,
        };
      }
      return {
        isPlaying: false,
        position: 0,
        duration: 0,
        isLoaded: false,
      };
    } catch (error) {
      console.error('Error getting playback status:', error);
      return null;
    }
  }

  /**
   * Start periodic status updates
   */
  private startStatusUpdates(): void {
    this.stopStatusUpdates();

    this.statusUpdateInterval = setInterval(async () => {
      if (this.sound && this.onStatusUpdate) {
        const status = await this.getStatus();
        if (status) {
          this.onStatusUpdate(status);
        }
      }
    }, 100);
  }

  /**
   * Stop status updates
   */
  private stopStatusUpdates(): void {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }
  }

  /**
   * Format duration in milliseconds to readable string
   */
  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  }
}

export const voicePlaybackService = new VoicePlaybackService();

