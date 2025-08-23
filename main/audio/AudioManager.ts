/**
 * AudioManager - Central orchestrator for all audio operations
 * RISK LEVEL 1: Core audio pipeline coordination
 */

import { EventEmitter } from 'events';
import { VADProcessor } from './VADProcessor';
import { PlaybackController } from './PlaybackController';
import { DeviceRouter } from './DeviceRouter';
import { TTSService, TTSConfig } from './TTSService';
import { AudioPlayer } from './AudioPlayer';
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
  private playback: PlaybackController;
  private router: DeviceRouter;
  private tts: TTSService;
  private audioPlayer: AudioPlayer;
  private llm: LLMService;
  private spotify: SpotifyService;
  private state: AudioPipelineState;
  private startTime: number = 0;

  constructor(ttsConfig: TTSConfig) {
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
    this.playback = new PlaybackController();
    this.router = new DeviceRouter();
    this.tts = new TTSService(ttsConfig);
    this.audioPlayer = new AudioPlayer();

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
        // CRITICAL PATH: VAD triggers immediate Spotify pause
    this.vad.on('speechStart', async () => {
      this.startTime = Date.now();
      console.log('[AudioManager] Speech detected, pausing playback...');

      try {
        await this.playback.pause();
        const pauseLatency = Date.now() - this.startTime;
        this.state.latencyMetrics.vadToSpotifyPause = pauseLatency;

        console.log(`[AudioManager] Playback paused in ${pauseLatency}ms`);
        this.emit('playbackPaused', { latency: pauseLatency });

        // Start the full pipeline: STT → LLM → TTS
        this.processVoiceInput();

      } catch (error) {
        console.error('[AudioManager] Failed to pause playback:', error);
        this.emit('playbackError', error);
      }
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
      await this.tts.initialize();
      await this.audioPlayer.initialize();
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

      // STEP 1: STT (Placeholder - Vapi team will implement)
      const userQuestion = await this.simulateSTT();
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
   * PLACEHOLDER: STT simulation for testing
   * Vapi team will replace this with real speech-to-text
   */
  private async simulateSTT(): Promise<string> {
    // Simulate STT processing time
    await new Promise(resolve => setTimeout(resolve, 800));

    // Return a sample question for testing
    const sampleQuestions = [
      "Who is the main character?",
      "What happened in the previous chapter?",
      "Can you explain this concept?",
      "What's the significance of this event?"
    ];

    return sampleQuestions[Math.floor(Math.random() * sampleQuestions.length)];
  }

  async startListening(): Promise<void> {
    if (this.state.isListening) return;

    this.state.isListening = true;
    await this.vad.start();
    this.emit('listeningStarted');
  }

  async stopListening(): Promise<void> {
    if (!this.state.isListening) return;

    this.state.isListening = false;
    await this.vad.stop();
    this.emit('listeningStopped');
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
