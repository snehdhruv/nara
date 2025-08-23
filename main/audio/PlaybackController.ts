/**
 * PlaybackController - Spotify/Audible playback control via AppleScript
 * RISK LEVEL 1: Critical for demo - if this fails, no pause/resume
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PlaybackState {
  isPlaying: boolean;
  position: number; // seconds
  track: string | null;
  application: 'spotify' | 'audible' | null;
}

export class PlaybackController {
  private currentApp: 'spotify' | 'audible' | null = null;
  private retryCount = 0;
  private maxRetries = 3;

  async initialize(): Promise<void> {
    console.log('[PlaybackController] Detecting active audio application...');

    // Try Spotify first, then Audible
    try {
      await this.detectActiveApp();
      console.log(`[PlaybackController] Using ${this.currentApp}`);
    } catch (error) {
      console.warn('[PlaybackController] No supported audio app detected');
      throw new Error('No supported audio application (Spotify/Audible) is running');
    }
  }

  private async detectActiveApp(): Promise<void> {
    // Check if Spotify is running and playing
    try {
      const spotifyState = await this.getSpotifyState();
      if (spotifyState.isPlaying) {
        this.currentApp = 'spotify';
        return;
      }
    } catch (error) {
      console.log('[PlaybackController] Spotify not available');
    }

    // Check if Audible is running
    try {
      const audibleRunning = await this.isAudibleRunning();
      if (audibleRunning) {
        this.currentApp = 'audible';
        return;
      }
    } catch (error) {
      console.log('[PlaybackController] Audible not available');
    }

    throw new Error('No active audio application found');
  }

  async pause(): Promise<void> {
    if (!this.currentApp) {
      throw new Error('No audio application initialized');
    }

    const startTime = Date.now();

    try {
      if (this.currentApp === 'spotify') {
        await this.pauseSpotify();
      } else if (this.currentApp === 'audible') {
        await this.pauseAudible();
      }

      const latency = Date.now() - startTime;
      console.log(`[PlaybackController] Paused ${this.currentApp} in ${latency}ms`);

    } catch (error) {
      // Retry logic for critical pause operation
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.warn(`[PlaybackController] Pause failed, retry ${this.retryCount}/${this.maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
        return this.pause();
      }

      this.retryCount = 0;
      throw error;
    }

    this.retryCount = 0;
  }

  async resume(): Promise<void> {
    if (!this.currentApp) {
      throw new Error('No audio application initialized');
    }

    try {
      if (this.currentApp === 'spotify') {
        await this.resumeSpotify();
      } else if (this.currentApp === 'audible') {
        await this.resumeAudible();
      }

      console.log(`[PlaybackController] Resumed ${this.currentApp}`);

    } catch (error) {
      // Retry logic for resume
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.warn(`[PlaybackController] Resume failed, retry ${this.retryCount}/${this.maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 250)); // 250ms delay
        return this.resume();
      }

      this.retryCount = 0;
      throw error;
    }

    this.retryCount = 0;
  }

  // Spotify AppleScript commands
  private async pauseSpotify(): Promise<void> {
    const script = 'tell application "Spotify" to pause';
    await execAsync(`osascript -e '${script}'`);
  }

  private async resumeSpotify(): Promise<void> {
    const script = 'tell application "Spotify" to play';
    await execAsync(`osascript -e '${script}'`);
  }

  private async getSpotifyState(): Promise<PlaybackState> {
    const script = `
      tell application "Spotify"
        set isPlaying to (player state as string is "playing")
        set currentTrack to name of current track
        set currentPosition to player position
        return isPlaying & "|" & currentTrack & "|" & currentPosition
      end tell
    `;

    const { stdout } = await execAsync(`osascript -e '${script}'`);
    const [playing, track, position] = stdout.trim().split('|');

    return {
      isPlaying: playing === 'true',
      position: parseFloat(position) || 0,
      track: track || null,
      application: 'spotify'
    };
  }

  // Audible controls (fallback to media keys)
  private async pauseAudible(): Promise<void> {
    // Use media key simulation for Audible
    await execAsync('osascript -e "tell application \\"System Events\\" to key code 49"'); // Space key
  }

  private async resumeAudible(): Promise<void> {
    // Use media key simulation for Audible
    await execAsync('osascript -e "tell application \\"System Events\\" to key code 49"'); // Space key
  }

  private async isAudibleRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('pgrep -f "Audible"');
      return stdout.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  async getState(): Promise<PlaybackState> {
    if (!this.currentApp) {
      return {
        isPlaying: false,
        position: 0,
        track: null,
        application: null
      };
    }

    if (this.currentApp === 'spotify') {
      return this.getSpotifyState();
    }

    // For Audible, we can't easily get state, so return basic info
    return {
      isPlaying: true, // Assume playing if Audible is active
      position: 0,
      track: 'Audible Audiobook',
      application: 'audible'
    };
  }
}
