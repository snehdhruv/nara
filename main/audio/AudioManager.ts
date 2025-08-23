/**
 * AudioManager - Central orchestrator for all audio operations
 * RISK LEVEL 1: Core audio pipeline coordination
 */

import { EventEmitter } from 'events';
import { VADProcessor } from './VADProcessor';
import { WakeWordService, WakeWordConfig } from './WakeWordService';
import { PlaybackController } from './PlaybackController';
import { DeviceRouter } from './DeviceRouter';
import { TTSService, TTSConfig } from './TTSService';
import { AudioPlayer } from './AudioPlayer';
import { VapiService, VapiConfig } from './VapiService';
import { LLMService, LLMRequest, createLLMService } from '../interfaces/LLMInterface';
import { SpotifyService, createSpotifyService } from '../interfaces/SpotifyInterface';

export interface AudioPipelineState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  currentDevice: string | null;
  latencyMetrics: {
    vadToSpotifyPause: number | null;
    sttToTTS: number | null;
    ttsEndToResume: number | null;
  };
}

export class AudioManager extends EventEmitter {
  private vad: VADProcessor;
  private wakeWord: WakeWordService;
  private playback: PlaybackController;
  private router: DeviceRouter;
  private tts: TTSService;
  private audioPlayer: AudioPlayer;
  private vapi: VapiService;
  private llm: LLMService;
  private spotify: SpotifyService;
  private state: AudioPipelineState;
  private startTime: number = 0;

  constructor(ttsConfig: TTSConfig, vapiConfig: VapiConfig, wakeWordConfig?: WakeWordConfig) {
    super();

    this.state = {
      isListening: false,
      isProcessing: false,
      isSpeaking: false,
      currentDevice: null,
      latencyMetrics: {
        vadToSpotifyPause: null,
        sttToTTS: null,
        ttsEndToResume: null,
      }
    };

    this.vad = new VADProcessor();
    this.wakeWord = new WakeWordService(wakeWordConfig);
    this.playback = new PlaybackController();
    this.router = new DeviceRouter();
    this.tts = new TTSService(ttsConfig);
    this.audioPlayer = new AudioPlayer();
    this.vapi = new VapiService(vapiConfig);

    // Initialize placeholder services (other teams will replace)
    this.llm = createLLMService({
      model: 'claude-3-sonnet',
      temperature: 0.7,
      maxTokens: 500,
      spoilerGuardEnabled: true,
      contextWindow: 3
    });
    this.spotify = createSpotifyService();

    this.setupEventHandlers();
  }

      private setupEventHandlers() {
    // CRITICAL PATH: Vapi wake word detection triggers immediate Spotify pause
    this.vapi.on('wakeWordDetected', async (detection) => {
      this.startTime = Date.now();
      console.log(`[AudioManager] 🎯 Vapi wake word detected: "${detection.phrase}" (${Math.round(detection.confidence * 100)}%)`);

      try {
        await this.playback.pause();
        const pauseLatency = Date.now() - this.startTime;
        this.state.latencyMetrics.vadToSpotifyPause = pauseLatency;

        console.log(`[AudioManager] Playback paused in ${pauseLatency}ms`);
        this.emit('playbackPaused', { latency: pauseLatency });

        // Switch Vapi to command listening mode and start the pipeline
        await this.vapi.startCommandListening();
        this.processVoiceInput();

      } catch (error) {
        console.error('[AudioManager] Failed to pause playback:', error);
        this.emit('playbackError', error);
      }
    });

    // Handle Vapi session end (return to wake word mode)
    this.vapi.on('sessionEnded', async () => {
      console.log('[AudioManager] Vapi session ended - returning to wake word mode');
      await this.vapi.resetToWakeWordMode();
    });

    // TTS playback completion triggers resume
    this.audioPlayer.on('playbackComplete', async () => {
      const resumeStart = Date.now();

      try {
        await this.playback.resume();
        const resumeLatency = Date.now() - resumeStart;
        this.state.latencyMetrics.ttsEndToResume = resumeLatency;

        console.log(`[AudioManager] Playback resumed in ${resumeLatency}ms`);
        this.emit('playbackResumed', { latency: resumeLatency });

        this.state.isSpeaking = false;
        this.state.isProcessing = false;

      } catch (error) {
        console.error('[AudioManager] Failed to resume playback:', error);
        this.emit('playbackError', error);
      }
    });

    // TTS service events
    this.tts.on('synthesisComplete', (data) => {
      const sttToTTSLatency = Date.now() - this.startTime;
      this.state.latencyMetrics.sttToTTS = sttToTTSLatency;
      console.log(`[AudioManager] TTS ready in ${sttToTTSLatency}ms total`);
    });
  }

    async initialize(): Promise<void> {
    console.log('[AudioManager] Initializing audio pipeline...');

    try {
      // Initialize in dependency order
      await this.router.initialize();
      await this.playback.initialize();
      await this.vad.initialize();
      await this.wakeWord.initialize();
      await this.tts.initialize();
      await this.audioPlayer.initialize();
      await this.vapi.initialize();
      await this.llm.initialize();
      await this.spotify.initialize();

      console.log('[AudioManager] Audio pipeline ready');
      this.emit('ready');

    } catch (error) {
      console.error('[AudioManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * CORE AUDIO PIPELINE: Voice Input → LLM → TTS → Resume
   * This is YOUR domain - the complete audio processing flow
   */
  private async processVoiceInput(): Promise<void> {
    this.state.isProcessing = true;

    try {
      console.log('[AudioManager] 🎤 Processing voice input...');

      // STEP 1: STT via Vapi (REAL IMPLEMENTATION)
      const userQuestion = await this.captureUserSpeech();
      console.log(`[AudioManager] 📝 STT Result: "${userQuestion}"`);

      // STEP 2: Get current book context from Spotify
      const playbackState = await this.spotify.getPlaybackState();
      const bookContext = {
        title: playbackState.track?.name || 'Unknown Book',
        author: playbackState.track?.artists[0] || 'Unknown Author',
        currentChapter: 1, // TODO: Extract from Spotify chapter data
        currentTimestamp: Math.floor((playbackState.position || 0) / 1000),
        userProgress: 25 // TODO: Calculate actual progress
      };

      // STEP 3: LLM Processing (Placeholder - LLM team will implement)
      const llmRequest: LLMRequest = {
        userQuestion,
        bookContext
      };

      console.log('[AudioManager] 🧠 Sending to LLM...');
      const llmResponse = await this.llm.processQuestion(llmRequest);
      console.log(`[AudioManager] 💭 LLM Response: "${llmResponse.answer}"`);

      // STEP 4: TTS Synthesis (YOUR IMPLEMENTATION)
      console.log('[AudioManager] 🗣️ Synthesizing TTS...');
      this.state.isSpeaking = true;

      const ttsResponse = await this.tts.synthesizeText(llmResponse.answer, {
        priority: 'high'
      });

      // STEP 5: Play TTS Audio (YOUR IMPLEMENTATION)
      console.log('[AudioManager] 🔊 Playing TTS audio...');
      await this.audioPlayer.playStream(ttsResponse.audioStream, {
        priority: 'high'
      });

      // Resume happens automatically via audioPlayer.on('playbackComplete')

    } catch (error) {
      console.error('[AudioManager] Voice processing failed:', error);

      // Emergency resume on failure
      try {
        await this.playback.resume();
      } catch (resumeError) {
        console.error('[AudioManager] Emergency resume failed:', resumeError);
      }

      this.state.isProcessing = false;
      this.state.isSpeaking = false;
      this.emit('processingError', error);
    }
  }

      /**
   * VAPI STT: Capture user speech (Vapi is already listening after wake word)
   */
  private async captureUserSpeech(): Promise<string> {
    console.log('[AudioManager] 🎤 Waiting for Vapi command transcription...');

    try {
      // Vapi is already listening in command mode after wake word detection
      // Just wait for the final transcription
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.vapi.resetToWakeWordMode();
          reject(new Error('Command timeout (10 seconds) - returning to wake word mode'));
        }, 10000); // 10 second timeout

        this.vapi.once('transcriptionComplete', (transcription) => {
          clearTimeout(timeout);

          // Don't process wake words as commands
          if (transcription.isWakeWord) {
            reject(new Error('Received wake word instead of command'));
            return;
          }

          resolve(transcription.text);
        });

        this.vapi.once('error', (error) => {
          clearTimeout(timeout);
          this.vapi.resetToWakeWordMode();
          reject(error);
        });
      });

    } catch (error) {
      console.error('[AudioManager] Vapi command capture failed:', error);
      // Return to wake word mode on error
      await this.vapi.resetToWakeWordMode();
      throw new Error(`Command capture failed: ${error}`);
    }
  }

      async startListening(): Promise<void> {
    if (this.state.isListening) return;

    console.log('[AudioManager] 👂 Starting Vapi wake word listening for "Hey Nara"...');

    this.state.isListening = true;
    await this.vapi.startWakeWordListening();
    this.emit('listeningStarted');
  }

  async stopListening(): Promise<void> {
    if (!this.state.isListening) return;

    console.log('[AudioManager] Stopping Vapi listening');

    this.state.isListening = false;
    await this.vapi.stopListening();
    this.emit('listeningStopped');
  }

  // Manual wake word trigger for testing
  triggerWakeWord(): void {
    console.log('[AudioManager] Manual wake word trigger - simulating Vapi detection');
    this.vapi.emit('wakeWordDetected', {
      phrase: 'hey nara (manual)',
      confidence: 1.0,
      timestamp: Date.now()
    });
  }

  getState(): AudioPipelineState {
    return { ...this.state };
  }

  // Emergency manual controls for demo
  async manualPause(): Promise<void> {
    await this.playback.pause();
  }

  async manualResume(): Promise<void> {
    await this.playback.resume();
  }
}
