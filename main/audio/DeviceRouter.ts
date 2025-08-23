/**
 * DeviceRouter - Audio device management and feedback prevention
 * RISK LEVEL 1: Feedback loops will kill the demo instantly
 */

import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AudioDevice {
  id: string;
  name: string;
  type: 'input' | 'output';
  isDefault: boolean;
  sampleRate: number;
  channels: number;
}

export interface DeviceConfiguration {
  microphoneDevice: AudioDevice | null;
  spotifyOutput: AudioDevice | null;  // For audiobook playback
  ttsOutput: AudioDevice | null;      // For TTS responses (separate to prevent feedback)
  feedbackPrevention: 'headphones' | 'separate_outputs' | 'aec';
}

export class DeviceRouter extends EventEmitter {
  private devices: AudioDevice[] = [];
  private config: DeviceConfiguration;
  private isMonitoring = false;

  constructor() {
    super();

    this.config = {
      microphoneDevice: null,
      spotifyOutput: null,
      ttsOutput: null,
      feedbackPrevention: 'headphones' // Default to safest option
    };
  }

  async initialize(): Promise<void> {
    console.log('[DeviceRouter] Initializing audio device management...');

    try {
      await this.enumerateDevices();
      await this.detectOptimalConfiguration();
      await this.startDeviceMonitoring();

      console.log('[DeviceRouter] Device routing configured:', this.config);
      this.emit('ready', this.config);

    } catch (error) {
      console.error('[DeviceRouter] Initialization failed:', error);
      throw error;
    }
  }

  private async enumerateDevices(): Promise<void> {
    try {
      // Use SoX or system_profiler to get audio devices on macOS
      const { stdout } = await execAsync('system_profiler SPAudioDataType -json');
      const audioData = JSON.parse(stdout);

      this.devices = this.parseAudioDevices(audioData);

      console.log(`[DeviceRouter] Found ${this.devices.length} audio devices`);
      this.emit('devicesUpdated', this.devices);

    } catch (error) {
      console.error('[DeviceRouter] Failed to enumerate devices:', error);
      // Fallback to basic device detection
      await this.fallbackDeviceDetection();
    }
  }

  private parseAudioDevices(audioData: any): AudioDevice[] {
    const devices: AudioDevice[] = [];

    // Parse macOS system_profiler output
    // This is a simplified parser - you'd need to handle the full structure
    if (audioData.SPAudioDataType) {
      audioData.SPAudioDataType.forEach((item: any) => {
        if (item._items) {
          item._items.forEach((device: any) => {
            // Add input devices
            if (device.coreaudio_input_source) {
              devices.push({
                id: device.coreaudio_device_id || device._name,
                name: device._name,
                type: 'input',
                isDefault: device.coreaudio_default_audio_input_device === 'spaudio_yes',
                sampleRate: 48000, // Default
                channels: 2
              });
            }

            // Add output devices
            if (device.coreaudio_output_source) {
              devices.push({
                id: device.coreaudio_device_id || device._name,
                name: device._name,
                type: 'output',
                isDefault: device.coreaudio_default_audio_output_device === 'spaudio_yes',
                sampleRate: 48000, // Default
                channels: 2
              });
            }
          });
        }
      });
    }

    return devices;
  }

  private async fallbackDeviceDetection(): Promise<void> {
    console.log('[DeviceRouter] Using fallback device detection...');

    // Basic fallback - assume system defaults
    this.devices = [
      {
        id: 'default_input',
        name: 'Default Microphone',
        type: 'input',
        isDefault: true,
        sampleRate: 48000,
        channels: 1
      },
      {
        id: 'default_output',
        name: 'Default Speakers',
        type: 'output',
        isDefault: true,
        sampleRate: 48000,
        channels: 2
      }
    ];
  }

  private async detectOptimalConfiguration(): Promise<void> {
    const inputDevices = this.devices.filter(d => d.type === 'input');
    const outputDevices = this.devices.filter(d => d.type === 'output');

    // Select microphone (prefer external mic over built-in)
    this.config.microphoneDevice = this.selectBestMicrophone(inputDevices);

    // Detect feedback prevention strategy
    const headphonesDetected = this.detectHeadphones(outputDevices);
    const multipleOutputs = outputDevices.length > 1;

    if (headphonesDetected) {
      this.config.feedbackPrevention = 'headphones';
      this.config.spotifyOutput = headphonesDetected;
      this.config.ttsOutput = headphonesDetected;

    } else if (multipleOutputs) {
      this.config.feedbackPrevention = 'separate_outputs';
      this.config.spotifyOutput = outputDevices.find(d => d.isDefault) || outputDevices[0];
      this.config.ttsOutput = outputDevices.find(d => !d.isDefault) || outputDevices[1];

    } else {
      console.warn('[DeviceRouter] Only speakers detected - AEC required for feedback prevention');
      this.config.feedbackPrevention = 'aec';
      this.config.spotifyOutput = outputDevices[0];
      this.config.ttsOutput = outputDevices[0];
    }
  }

  private selectBestMicrophone(inputDevices: AudioDevice[]): AudioDevice | null {
    if (inputDevices.length === 0) return null;

    // Prefer external microphones over built-in
    const external = inputDevices.find(d =>
      !d.name.toLowerCase().includes('built-in') &&
      !d.name.toLowerCase().includes('internal')
    );

    return external || inputDevices.find(d => d.isDefault) || inputDevices[0];
  }

  private detectHeadphones(outputDevices: AudioDevice[]): AudioDevice | null {
    return outputDevices.find(d =>
      d.name.toLowerCase().includes('headphone') ||
      d.name.toLowerCase().includes('airpods') ||
      d.name.toLowerCase().includes('beats') ||
      d.name.toLowerCase().includes('sony') ||
      d.name.toLowerCase().includes('bose')
    ) || null;
  }

  private async startDeviceMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Poll for device changes every 5 seconds
    const checkDevices = async () => {
      if (!this.isMonitoring) return;

      try {
        const previousDeviceCount = this.devices.length;
        await this.enumerateDevices();

        if (this.devices.length !== previousDeviceCount) {
          console.log('[DeviceRouter] Device change detected, reconfiguring...');
          await this.detectOptimalConfiguration();
          this.emit('configurationChanged', this.config);
        }

      } catch (error) {
        console.error('[DeviceRouter] Device monitoring error:', error);
      }

      setTimeout(checkDevices, 5000);
    };

    checkDevices();
  }

  getConfiguration(): DeviceConfiguration {
    return { ...this.config };
  }

  getDevices(): AudioDevice[] {
    return [...this.devices];
  }

  async setMicrophone(deviceId: string): Promise<void> {
    const device = this.devices.find(d => d.id === deviceId && d.type === 'input');
    if (!device) {
      throw new Error(`Microphone device not found: ${deviceId}`);
    }

    this.config.microphoneDevice = device;
    this.emit('configurationChanged', this.config);
  }

  async setTTSOutput(deviceId: string): Promise<void> {
    const device = this.devices.find(d => d.id === deviceId && d.type === 'output');
    if (!device) {
      throw new Error(`Output device not found: ${deviceId}`);
    }

    this.config.ttsOutput = device;
    this.emit('configurationChanged', this.config);
  }

  // Validate current configuration for feedback prevention
  validateConfiguration(): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (!this.config.microphoneDevice) {
      warnings.push('No microphone device selected');
    }

    if (!this.config.ttsOutput) {
      warnings.push('No TTS output device selected');
    }

    if (this.config.feedbackPrevention === 'aec') {
      warnings.push('Using speakers - feedback possible without AEC');
    }

    if (this.config.spotifyOutput?.id === this.config.ttsOutput?.id &&
        this.config.feedbackPrevention !== 'headphones') {
      warnings.push('Same output device for Spotify and TTS - potential audio conflicts');
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }

  async destroy(): Promise<void> {
    this.isMonitoring = false;
    this.removeAllListeners();
  }
}
