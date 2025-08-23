/**
 * AudioManager - Central coordinator for all audio operations
 * Manages TTS, STT, playback state, and audio device routing
 */

import { EventEmitter } from 'events';
import { VapiService, VapiConfig } from './VapiService';
import { TTSService, TTSConfig } from './TTSService';

export interface AudioPipelineState {
  isInitialized: boolean;
  isListening: boolean;
  isPlaying: boolean;
  currentInteraction: string | null;
  audioDevices: AudioDevice[];
  currentDevice: AudioDevice | null;
  volume: number;
  isMuted: boolean;
}

export interface AudioDevice {
  id: string;
  name: string;
  type: 'input' | 'output' | 'both';
  isDefault: boolean;
  isConnected: boolean;
}

export interface AudioManagerConfig {
  vapi: VapiConfig;
  tts: TTSConfig;
  defaultVolume?: number;
  enableDeviceRouting?: boolean;
}

export class AudioManager extends EventEmitter {
  private config: AudioManagerConfig;
  private vapi: VapiService;
  private tts: TTSService;
  private state: AudioPipelineState;
  private currentAudio: HTMLAudioElement | null = null;
  private interactionCounter = 0;

  constructor(config: AudioManagerConfig) {
    super();
    this.config = {
      defaultVolume: 0.8,
      enableDeviceRouting: false,
      ...config
    };

    this.vapi = new VapiService(this.config.vapi);
    this.tts = new TTSService(this.config.tts);

    this.state = {
      isInitialized: false,
      isListening: false,
      isPlaying: false,
      currentInteraction: null,
      audioDevices: [],
      currentDevice: null,
      volume: this.config.defaultVolume!,
      isMuted: false
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Vapi events
    this.vapi.on('ready', () => {
      console.log('[AudioManager] STT service ready');
      this.emit('sttReady');
    });

    this.vapi.on('transcription', (transcription) => {
      this.emit('transcription', transcription);
    });

    this.vapi.on('wakeWordDetected', (detection) => {
      console.log('[AudioManager] Wake word detected:', detection.phrase);
      this.emit('wakeWordDetected', detection);
    });

    this.vapi.on('sessionStarted', () => {
      this.state.isListening = true;
      this.emit('listeningStarted');
    });

    this.vapi.on('sessionStopped', () => {
      this.state.isListening = false;
      this.emit('listeningStopped');
    });

    // TTS events
    this.tts.on('ready', () => {
      console.log('[AudioManager] TTS service ready');
      this.emit('ttsReady');
    });

    this.tts.on('synthesisComplete', (event) => {
      this.emit('ttsComplete', event);
    });

    this.tts.on('synthesisError', (event) => {
      console.error('[AudioManager] TTS error:', event.error);
      this.emit('ttsError', event);
    });
  }

  async initialize(): Promise<void> {
    console.log('[AudioManager] Initializing audio pipeline...');

    try {
      // Initialize services in parallel
      await Promise.all([
        this.vapi.initialize(),
        this.tts.initialize()
      ]);

      // Discover audio devices if enabled
      if (this.config.enableDeviceRouting) {
        await this.discoverAudioDevices();
      }

      this.state.isInitialized = true;
      console.log('[AudioManager] Audio pipeline ready');
      this.emit('ready', this.state);

    } catch (error) {
      console.error('[AudioManager] Initialization failed:', error);
      throw error;
    }
  }

  private async discoverAudioDevices(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.state.audioDevices = devices
          .filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput')
          .map(device => ({
            id: device.deviceId,
            name: device.label || `${device.kind} device`,
            type: device.kind === 'audioinput' ? 'input' : 'output',
            isDefault: device.deviceId === 'default',
            isConnected: true
          }));

        console.log(`[AudioManager] Found ${this.state.audioDevices.length} audio devices`);
      }
    } catch (error) {
      console.warn('[AudioManager] Could not enumerate audio devices:', error);
    }
  }

  async startListening(): Promise<string> {
    if (!this.state.isInitialized) {
      throw new Error('AudioManager not initialized');
    }

    console.log('[AudioManager] Starting voice listening...');
    const session = await this.vapi.startListening();
    return session.sessionId;
  }

  async stopListening(): Promise<void> {
    if (this.state.isListening) {
      console.log('[AudioManager] Stopping voice listening...');
      await this.vapi.stopListening();
    }
  }

  async beginInteraction(id?: string): Promise<string> {
    const interactionId = id || `interaction_${++this.interactionCounter}`;
    
    console.log(`[AudioManager] Beginning interaction: ${interactionId}`);
    
    // Stop any current audio playback
    await this.stopCurrentAudio();
    
    // Pause background audio if needed (would integrate with Spotify/playback here)
    this.emit('pauseBackgroundAudio', interactionId);
    
    this.state.currentInteraction = interactionId;
    this.emit('interactionStarted', interactionId);
    
    return interactionId;
  }

  async endInteraction(id: string): Promise<void> {
    if (this.state.currentInteraction !== id) {
      console.warn(`[AudioManager] Interaction ${id} not current, ignoring end request`);
      return;
    }

    console.log(`[AudioManager] Ending interaction: ${id}`);
    
    this.state.currentInteraction = null;
    
    // Resume background audio
    this.emit('resumeBackgroundAudio', id);
    this.emit('interactionEnded', id);
  }

  async playTTS(interactionId: string, text: string, voiceProfile?: string): Promise<void> {
    if (this.state.currentInteraction !== interactionId) {
      console.warn(`[AudioManager] Interaction ${interactionId} not current, ignoring TTS request`);
      return;
    }

    console.log(`[AudioManager] Playing TTS for interaction ${interactionId}: "${text.substring(0, 50)}..."`);

    try {
      // Stop any current TTS
      await this.stopCurrentAudio();

      // Synthesize audio
      const ttsResponse = await this.tts.synthesizeText(text, { priority: 'high' });
      
      this.state.isPlaying = true;
      this.emit('ttsStarted', { interactionId, text });

      // Play audio (for browser environment)
      if (typeof Audio !== 'undefined') {
        this.currentAudio = new Audio();
        this.currentAudio.volume = this.state.isMuted ? 0 : this.state.volume;
        
        // Convert stream to blob URL for browser playback
        const chunks: Uint8Array[] = [];
        
        ttsResponse.audioStream.on('data', (chunk) => {
          chunks.push(chunk);
        });

        ttsResponse.audioStream.on('end', () => {
          const blob = new Blob(chunks, { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(blob);
          
          if (this.currentAudio) {
            this.currentAudio.src = audioUrl;
            this.currentAudio.play().catch(error => {
              console.error('[AudioManager] Audio playback failed:', error);
              this.emit('ttsError', { interactionId, error });
            });

            this.currentAudio.onended = () => {
              this.state.isPlaying = false;
              this.emit('ttsEnded', { interactionId });
              URL.revokeObjectURL(audioUrl);
            };
          }
        });

        ttsResponse.audioStream.on('error', (error) => {
          console.error('[AudioManager] TTS stream error:', error);
          this.emit('ttsError', { interactionId, error });
        });
      }

    } catch (error) {
      this.state.isPlaying = false;
      console.error('[AudioManager] TTS playback failed:', error);
      this.emit('ttsError', { interactionId, error });
      throw error;
    }
  }

  async stopCurrentAudio(): Promise<void> {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.state.isPlaying = false;
  }

  async seekTo(positionS: number): Promise<void> {
    console.log(`[AudioManager] Seeking to position: ${positionS}s`);
    this.emit('seekRequested', positionS);
  }

  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume));
    if (this.currentAudio) {
      this.currentAudio.volume = this.state.isMuted ? 0 : this.state.volume;
    }
    this.emit('volumeChanged', this.state.volume);
  }

  setMuted(muted: boolean): void {
    this.state.isMuted = muted;
    if (this.currentAudio) {
      this.currentAudio.volume = muted ? 0 : this.state.volume;
    }
    this.emit('muteChanged', muted);
  }

  getState(): AudioPipelineState {
    return { ...this.state };
  }

  getVapiService(): VapiService {
    return this.vapi;
  }

  getTTSService(): TTSService {
    return this.tts;
  }

  async destroy(): Promise<void> {
    console.log('[AudioManager] Destroying audio pipeline...');

    await this.stopListening();
    await this.stopCurrentAudio();

    await Promise.all([
      this.vapi.destroy(),
      this.tts.destroy()
    ]);

    this.state.isInitialized = false;
    this.removeAllListeners();
  }
}