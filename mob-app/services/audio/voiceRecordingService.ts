import { Audio } from 'expo-av';
import { announceToScreenReader } from '../accessibility/accessibilityUtils';

export interface RecordingStatus {
  isRecording: boolean;
  duration: number; // in milliseconds
  uri?: string;
}

/**
 * Voice Recording Service
 * Handles audio recording for voice bios and voice messages
 */
class VoiceRecordingService {
  private recording: Audio.Recording | null = null;
  private statusUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private onStatusUpdate?: (status: RecordingStatus) => void;

  /**
   * Request audio recording permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        await announceToScreenReader('Microphone permission is required to record voice messages', { isAlert: true });
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      await announceToScreenReader('Failed to request microphone permission', { isAlert: true });
      return false;
    }
  }

  /**
   * Start recording audio
   */
  async startRecording(onStatusUpdate?: (status: RecordingStatus) => void): Promise<boolean> {
    try {
      // Request permissions if not granted
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      // Stop any existing recording
      if (this.recording) {
        await this.stopRecording();
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create new recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      this.onStatusUpdate = onStatusUpdate;

      // Start status updates
      this.startStatusUpdates();

      await announceToScreenReader('Recording started');
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      await announceToScreenReader('Failed to start recording', { isAlert: true });
      return false;
    }
  }

  /**
   * Stop recording and return the audio URI
   */
  async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording) {
        return null;
      }

      // Stop status updates
      this.stopStatusUpdates();

      // Stop recording
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });

      this.recording = null;
      this.onStatusUpdate = undefined;

      if (uri) {
        await announceToScreenReader('Recording stopped');
        return uri;
      }

      return null;
    } catch (error) {
      console.error('Error stopping recording:', error);
      await announceToScreenReader('Failed to stop recording', { isAlert: true });
      return null;
    }
  }

  /**
   * Cancel recording without saving
   */
  async cancelRecording(): Promise<void> {
    try {
      if (!this.recording) {
        return;
      }

      this.stopStatusUpdates();
      await this.recording.stopAndUnloadAsync();
      
      const uri = this.recording.getURI();
      // Note: File cleanup should be handled by the system or manually if needed
      // FileSystem.deleteAsync requires expo-file-system package

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });

      this.recording = null;
      this.onStatusUpdate = undefined;

      await announceToScreenReader('Recording cancelled');
    } catch (error) {
      console.error('Error cancelling recording:', error);
    }
  }

  /**
   * Get current recording status
   */
  async getStatus(): Promise<RecordingStatus | null> {
    if (!this.recording) {
      return null;
    }

    try {
      const status = await this.recording.getStatusAsync();
      return {
        isRecording: status.isRecording,
        duration: status.durationMillis || 0,
        uri: status.uri || undefined,
      };
    } catch (error) {
      console.error('Error getting recording status:', error);
      return null;
    }
  }

  /**
   * Start periodic status updates
   */
  private startStatusUpdates(): void {
    this.stopStatusUpdates(); // Clear any existing interval

    this.statusUpdateInterval = setInterval(async () => {
      if (this.recording && this.onStatusUpdate) {
        const status = await this.getStatus();
        if (status) {
          this.onStatusUpdate(status);
        }
      }
    }, 100); // Update every 100ms
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

export const voiceRecordingService = new VoiceRecordingService();

