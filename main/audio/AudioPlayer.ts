/**
 * AudioPlayer - TTS audio playback with device routing
 * YOUR DOMAIN: Stream TTS audio to correct output device
 */

import { EventEmitter } from 'events';
import { Readable } from 'stream';
import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface AudioPlayerConfig {
  outputDevice?: string; // Device ID for TTS output
  volume: number; // 0-100
  format: 'mp3' | 'wav';
  sampleRate: number;
  bufferSize: number; // milliseconds
}

export interface PlaybackMetrics {
  latencyToFirstSound: number; // ms from play() call to first audio
  totalPlaybackTime: number; // ms total playback duration
  bufferUnderruns: number; // Count of audio dropouts
  averageLatency: number; // Running average of playback latency
}

export class AudioPlayer extends EventEmitter {
  private config: AudioPlayerConfig;
  private isPlaying = false;
  private currentProcess: ChildProcess | null = null;
  private metrics: PlaybackMetrics;
  private tempFiles: string[] = [];

  constructor(config: Partial<AudioPlayerConfig> = {}) {
    super();

    this.config = {
      volume: 80,
      format: 'mp3',
      sampleRate: 22050,
      bufferSize: 200, // 200ms buffer
      ...config
    };

    this.metrics = {
      latencyToFirstSound: 0,
      totalPlaybackTime: 0,
      bufferUnderruns: 0,
      averageLatency: 0
    };
  }

  async initialize(): Promise<void> {
    console.log('[AudioPlayer] Initializing TTS audio player...');

    try {
      // Check if we have audio playback tools available
      await this.checkAudioTools();

      console.log('[AudioPlayer] Audio player ready');
      this.emit('ready');

    } catch (error) {
      console.error('[AudioPlayer] Initialization failed:', error);
      throw error;
    }
  }

  private async checkAudioTools(): Promise<void> {
    // Check for available audio players on macOS
    const tools = ['afplay', 'sox', 'ffplay'];

    for (const tool of tools) {
      try {
        const process = spawn('which', [tool]);
        await new Promise((resolve, reject) => {
          process.on('close', (code) => {
            if (code === 0) {
              console.log(`[AudioPlayer] Found audio tool: ${tool}`);
              resolve(void 0);
            } else {
              reject(new Error(`${tool} not found`));
            }
          });
        });
        return; // Found a working tool
      } catch (error) {
        continue; // Try next tool
      }
    }

    throw new Error('No audio playback tools found (afplay, sox, or ffplay required)');
  }

  async playStream(audioStream: Readable, options: { priority?: 'normal' | 'high' } = {}): Promise<void> {
    if (this.isPlaying && options.priority !== 'high') {
      throw new Error('Audio player is busy - use priority: high to interrupt');
    }

    const startTime = Date.now();

    try {
      // Stop current playback if interrupting
      if (this.isPlaying) {
        await this.stop();
      }

      this.isPlaying = true;

      // For streaming, we'll use a temp file approach
      // In production, you might want to use a more sophisticated streaming solution
      const tempFile = await this.streamToTempFile(audioStream);

      const firstSoundLatency = Date.now() - startTime;

      // Play the audio file
      await this.playFile(tempFile);

      const totalTime = Date.now() - startTime;

      // Update metrics
      this.metrics.latencyToFirstSound = firstSoundLatency;
      this.metrics.totalPlaybackTime = totalTime;
      this.updateAverageLatency(firstSoundLatency);

      console.log(`[AudioPlayer] TTS playback completed in ${totalTime}ms (first sound: ${firstSoundLatency}ms)`);

      this.emit('playbackComplete', {
        latency: firstSoundLatency,
        duration: totalTime
      });

    } catch (error) {
      console.error('[AudioPlayer] Playback failed:', error);
      this.emit('playbackError', error);
      throw error;

    } finally {
      this.isPlaying = false;
      this.cleanupTempFiles();
    }
  }

  private async streamToTempFile(audioStream: Readable): Promise<string> {
    const tempFile = join(tmpdir(), `nara_tts_${Date.now()}.${this.config.format}`);
    this.tempFiles.push(tempFile);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      audioStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      audioStream.on('end', () => {
        try {
          const audioBuffer = Buffer.concat(chunks);
          writeFileSync(tempFile, audioBuffer);
          resolve(tempFile);
        } catch (error) {
          reject(error);
        }
      });

      audioStream.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async playFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use afplay on macOS (best for low latency)
      const args = [filePath];

      // Add volume control if supported
      if (this.config.volume !== 100) {
        args.unshift('-v', (this.config.volume / 100).toString());
      }

      // Add device selection if specified
      if (this.config.outputDevice) {
        // Note: afplay doesn't support device selection directly
        // You might need to use a different approach or system audio routing
        console.warn('[AudioPlayer] Device selection not supported with afplay');
      }

      this.currentProcess = spawn('afplay', args);

      this.currentProcess.on('close', (code) => {
        this.currentProcess = null;

        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Audio playback failed with code ${code}`));
        }
      });

      this.currentProcess.on('error', (error) => {
        this.currentProcess = null;
        reject(error);
      });

      // Emit started event after a brief delay (audio should be starting)
      setTimeout(() => {
        this.emit('playbackStarted');
      }, 50);
    });
  }

  async stop(): Promise<void> {
    if (!this.isPlaying || !this.currentProcess) {
      return;
    }

    console.log('[AudioPlayer] Stopping TTS playback...');

    this.currentProcess.kill('SIGTERM');
    this.currentProcess = null;
    this.isPlaying = false;

    this.emit('playbackStopped');
  }

  async setVolume(volume: number): Promise<void> {
    if (volume < 0 || volume > 100) {
      throw new Error('Volume must be between 0 and 100');
    }

    this.config.volume = volume;
    console.log(`[AudioPlayer] Volume set to ${volume}%`);
  }

  async setOutputDevice(deviceId: string): Promise<void> {
    this.config.outputDevice = deviceId;
    console.log(`[AudioPlayer] Output device set to ${deviceId}`);

    // Note: Implementing device routing on macOS requires additional work
    // You might need to use Audio Hijack, SoundFlower, or similar tools
    console.warn('[AudioPlayer] Device routing requires additional macOS audio routing setup');
  }

  private updateAverageLatency(newLatency: number): void {
    if (this.metrics.averageLatency === 0) {
      this.metrics.averageLatency = newLatency;
    } else {
      // Simple moving average
      this.metrics.averageLatency = (this.metrics.averageLatency * 0.8) + (newLatency * 0.2);
    }
  }

  private cleanupTempFiles(): void {
    this.tempFiles.forEach(file => {
      try {
        if (existsSync(file)) {
          unlinkSync(file);
        }
      } catch (error) {
        console.warn(`[AudioPlayer] Failed to cleanup temp file ${file}:`, error);
      }
    });
    this.tempFiles = [];
  }

  getMetrics(): PlaybackMetrics {
    return { ...this.metrics };
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  getConfig(): AudioPlayerConfig {
    return { ...this.config };
  }

  async destroy(): Promise<void> {
    await this.stop();
    this.cleanupTempFiles();
    this.removeAllListeners();
  }
}
