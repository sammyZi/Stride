/**
 * Audio Announcement Service
 * 
 * Manages audio announcements during activity tracking:
 * - Text-to-speech announcements for distance milestones
 * - Configurable announcement intervals
 * - Distance and pace information
 * - Enable/disable functionality
 */

import * as Speech from 'expo-speech';
import { UnitSystem } from '@/types';
import { formatDistance, formatPace } from '@/utils/formatting';

interface AnnouncementOptions {
  enabled: boolean;
  interval: number; // in meters
  units: UnitSystem;
}

class AudioAnnouncementService {
  private options: AnnouncementOptions = {
    enabled: true,
    interval: 1000, // Default: 1km
    units: 'metric',
  };
  private lastAnnouncedDistance: number = 0;
  private isSpeaking: boolean = false;

  /**
   * Initialize the audio announcement service
   * 
   * @param options - Configuration options
   */
  initialize(options: Partial<AnnouncementOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    };
    this.lastAnnouncedDistance = 0;
  }

  /**
   * Update announcement settings
   * 
   * @param options - Updated configuration options
   */
  updateSettings(options: Partial<AnnouncementOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    };
  }

  /**
   * Enable audio announcements
   */
  enable(): void {
    this.options.enabled = true;
  }

  /**
   * Disable audio announcements
   */
  disable(): void {
    this.options.enabled = false;
    this.stop();
  }

  /**
   * Check if announcements are enabled
   * 
   * @returns True if enabled
   */
  isEnabled(): boolean {
    return this.options.enabled;
  }

  /**
   * Set announcement interval
   * 
   * @param interval - Interval in meters
   */
  setInterval(interval: number): void {
    this.options.interval = interval;
  }

  /**
   * Set unit system
   * 
   * @param units - Unit system (metric/imperial)
   */
  setUnits(units: UnitSystem): void {
    this.options.units = units;
  }

  /**
   * Check if a distance milestone should trigger an announcement
   * 
   * @param currentDistance - Current distance in meters
   * @returns True if announcement should be made
   */
  shouldAnnounce(currentDistance: number): boolean {
    if (!this.options.enabled) {
      return false;
    }

    // Check if we've crossed an interval threshold
    const currentMilestone = Math.floor(currentDistance / this.options.interval);
    const lastMilestone = Math.floor(this.lastAnnouncedDistance / this.options.interval);

    return currentMilestone > lastMilestone;
  }

  /**
   * Announce distance milestone with pace information
   * 
   * @param distance - Distance in meters
   * @param pace - Pace in seconds per km
   */
  async announceDistance(distance: number, pace: number): Promise<void> {
    if (!this.options.enabled || this.isSpeaking) {
      return;
    }

    try {
      this.isSpeaking = true;
      this.lastAnnouncedDistance = distance;

      const announcement = this.createDistanceAnnouncement(distance, pace);
      
      await Speech.speak(announcement, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9, // Slightly slower for clarity
        volume: 1.0,
        onDone: () => {
          this.isSpeaking = false;
        },
        onError: (error) => {
          console.error('Speech error:', error);
          this.isSpeaking = false;
        },
      });
    } catch (error) {
      console.error('Error announcing distance:', error);
      this.isSpeaking = false;
    }
  }

  /**
   * Announce activity start
   * 
   * @param activityType - Type of activity (not used, kept for compatibility)
   */
  async announceStart(activityType: 'activity'): Promise<void> {
    if (!this.options.enabled || this.isSpeaking) {
      return;
    }

    try {
      this.isSpeaking = true;
      const announcement = 'Activity started';
      
      await Speech.speak(announcement, {
        language: 'en-US',
        pitch: 1.0,
        rate: 1.0,
        volume: 1.0,
        onDone: () => {
          this.isSpeaking = false;
        },
        onError: () => {
          this.isSpeaking = false;
        },
      });
    } catch (error) {
      console.error('Error announcing start:', error);
      this.isSpeaking = false;
    }
  }

  /**
   * Announce activity pause
   */
  async announcePause(): Promise<void> {
    if (!this.options.enabled || this.isSpeaking) {
      return;
    }

    try {
      this.isSpeaking = true;
      
      await Speech.speak('Activity paused', {
        language: 'en-US',
        pitch: 1.0,
        rate: 1.0,
        volume: 1.0,
        onDone: () => {
          this.isSpeaking = false;
        },
        onError: () => {
          this.isSpeaking = false;
        },
      });
    } catch (error) {
      console.error('Error announcing pause:', error);
      this.isSpeaking = false;
    }
  }

  /**
   * Announce activity resume
   */
  async announceResume(): Promise<void> {
    if (!this.options.enabled || this.isSpeaking) {
      return;
    }

    try {
      this.isSpeaking = true;
      
      await Speech.speak('Activity resumed', {
        language: 'en-US',
        pitch: 1.0,
        rate: 1.0,
        volume: 1.0,
        onDone: () => {
          this.isSpeaking = false;
        },
        onError: () => {
          this.isSpeaking = false;
        },
      });
    } catch (error) {
      console.error('Error announcing resume:', error);
      this.isSpeaking = false;
    }
  }

  /**
   * Announce activity completion with summary
   * 
   * @param distance - Total distance in meters
   * @param duration - Total duration in seconds
   * @param pace - Average pace in seconds per km
   */
  async announceCompletion(
    distance: number,
    duration: number,
    pace: number
  ): Promise<void> {
    if (!this.options.enabled || this.isSpeaking) {
      return;
    }

    try {
      this.isSpeaking = true;
      const announcement = this.createCompletionAnnouncement(distance, duration, pace);
      
      await Speech.speak(announcement, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
        volume: 1.0,
        onDone: () => {
          this.isSpeaking = false;
        },
        onError: () => {
          this.isSpeaking = false;
        },
      });
    } catch (error) {
      console.error('Error announcing completion:', error);
      this.isSpeaking = false;
    }
  }

  /**
   * Stop any ongoing speech
   */
  stop(): void {
    try {
      Speech.stop();
      this.isSpeaking = false;
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  /**
   * Reset the service (clear last announced distance)
   */
  reset(): void {
    this.lastAnnouncedDistance = 0;
    this.stop();
  }

  /**
   * Check if speech is available on the device
   * 
   * @returns Promise resolving to true if available
   */
  async isSpeechAvailable(): Promise<boolean> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices.length > 0;
    } catch (error) {
      console.error('Error checking speech availability:', error);
      return false;
    }
  }

  /**
   * Create distance announcement text
   * 
   * @param distance - Distance in meters
   * @param pace - Pace in seconds per km
   * @returns Announcement text
   */
  private createDistanceAnnouncement(distance: number, pace: number): string {
    const distanceStr = formatDistance(distance, this.options.units, 1);
    const paceStr = this.formatPaceForSpeech(pace);

    return `${distanceStr} completed. Current pace: ${paceStr}`;
  }

  /**
   * Create completion announcement text
   * 
   * @param distance - Total distance in meters
   * @param duration - Total duration in seconds
   * @param pace - Average pace in seconds per km
   * @returns Announcement text
   */
  private createCompletionAnnouncement(
    distance: number,
    duration: number,
    pace: number
  ): string {
    const distanceStr = formatDistance(distance, this.options.units, 2);
    const durationMinutes = Math.floor(duration / 60);
    const durationSeconds = Math.floor(duration % 60);
    const paceStr = this.formatPaceForSpeech(pace);

    let durationStr = '';
    if (durationMinutes > 0) {
      durationStr = `${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}`;
      if (durationSeconds > 0) {
        durationStr += ` and ${durationSeconds} second${durationSeconds !== 1 ? 's' : ''}`;
      }
    } else {
      durationStr = `${durationSeconds} second${durationSeconds !== 1 ? 's' : ''}`;
    }

    return `Activity complete. ${distanceStr} in ${durationStr}. Average pace: ${paceStr}`;
  }

  /**
   * Format pace for speech (more natural than visual format)
   * 
   * @param pace - Pace in seconds per km
   * @returns Formatted pace string for speech
   */
  private formatPaceForSpeech(pace: number): string {
    if (pace <= 0 || !isFinite(pace)) {
      return 'calculating';
    }

    const minutes = Math.floor(pace / 60);
    const seconds = Math.floor(pace % 60);

    const unit = this.options.units === 'metric' ? 'kilometer' : 'mile';
    
    if (seconds === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} per ${unit}`;
    }

    return `${minutes} minute${minutes !== 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''} per ${unit}`;
  }
}

// Export singleton instance
const audioAnnouncementService = new AudioAnnouncementService();
export default audioAnnouncementService;
