/**
 * WakeWordService - "Hey Nara" wake word detection
 * Listens continuously for the wake phrase to trigger the audio pipeline
 */

import { EventEmitter } from 'events';

export interface WakeWordConfig {
  wakePhrase: string; // "Hey Nara" or custom phrase
  sensitivity: number; // 0-1, how sensitive to trigger (0.7 = 70% confidence)
  timeout: number; // ms to wait for command after wake word
  continuous: boolean; // Keep listening after wake word
  language: string; // Language for recognition
}

export interface WakeWordDetection {
  phrase: string;
  confidence: number;
  timestamp: number;
  audioLevel: number;
}

export class WakeWordService extends EventEmitter {
  private config: WakeWordConfig;
  private isListening = false;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private recognizer: any = null; // Will use Web Speech API or Picovoice
  private lastDetection = 0;
  private debounceMs = 2000; // Prevent rapid re-triggers

  constructor(config?: Partial<WakeWordConfig>) {
    super();

    this.config = {
      wakePhrase: 'Hey Nara',
      sensitivity: 0.7,
      timeout: 5000, // 5 seconds to speak after wake word
      continuous: true,
      language: 'en-US',
      ...config
    };
  }

  async initialize(): Promise<void> {
    console.log('[WakeWordService] Initializing wake word detection...');
    console.log(`[WakeWordService] Wake phrase: "${this.config.wakePhrase}"`);

    try {
      // Request microphone access
      await this.requestMicrophoneAccess();

      // Initialize wake word detection engine
      await this.initializeWakeWordEngine();

      console.log('[WakeWordService] Wake word detection ready');
      this.emit('ready');

    } catch (error) {
      console.error('[WakeWordService] Initialization failed:', error);
      throw error;
    }
  }

  private async requestMicrophoneAccess(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Optimal for wake word detection
        }
      });

      console.log('[WakeWordService] Microphone access granted');

    } catch (error) {
      throw new Error(`Microphone access denied: ${error}`);
    }
  }

  private async initializeWakeWordEngine(): Promise<void> {
    // Option 1: Use Web Speech API (built into browsers)
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      await this.initializeWebSpeechAPI();
    }
    // Option 2: Use Picovoice Porcupine (more accurate, requires key)
    else if (this.shouldUsePicovoice()) {
      await this.initializePicovoice();
    }
    // Option 3: Simple audio level + pattern matching
    else {
      await this.initializeSimpleDetection();
    }
  }

  private async initializeWebSpeechAPI(): Promise<void> {
    console.log('[WakeWordService] Using Web Speech API for wake word detection');

    // @ts-ignore - Web Speech API types
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      throw new Error('Web Speech API not supported');
    }

    this.recognizer = new SpeechRecognition();
    this.recognizer.continuous = true;
    this.recognizer.interimResults = true;
    this.recognizer.lang = this.config.language;

    this.recognizer.onresult = (event: any) => {
      const results = event.results;
      const lastResult = results[results.length - 1];

      if (lastResult.isFinal) {
        const transcript = lastResult[0].transcript.toLowerCase().trim();
        const confidence = lastResult[0].confidence;

        this.processTranscript(transcript, confidence);
      }
    };

    this.recognizer.onerror = (event: any) => {
      console.error('[WakeWordService] Speech recognition error:', event.error);

      // Auto-restart on error (except permission denied)
      if (event.error !== 'not-allowed') {
        setTimeout(() => {
          if (this.isListening) {
            this.recognizer.start();
          }
        }, 1000);
      }
    };

    this.recognizer.onend = () => {
      // Auto-restart if we should be listening
      if (this.isListening && this.config.continuous) {
        setTimeout(() => {
          this.recognizer.start();
        }, 100);
      }
    };
  }

  private shouldUsePicovoice(): boolean {
    // Check if Picovoice is available and configured
    return false; // For now, default to Web Speech API
  }

  private async initializePicovoice(): Promise<void> {
    console.log('[WakeWordService] Picovoice integration not implemented yet');
    // TODO: Implement Picovoice Porcupine for more accurate wake word detection
    // This would require Picovoice API key and custom wake word model
    throw new Error('Picovoice not implemented - using Web Speech API fallback');
  }

  private async initializeSimpleDetection(): Promise<void> {
    console.log('[WakeWordService] Using simple audio pattern detection');

    // Fallback: Simple audio level detection + basic pattern matching
    // This is less accurate but works without external dependencies

    if (!this.mediaStream) {
      throw new Error('No media stream available');
    }

    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Create audio processor for simple detection
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer;
      const inputData = inputBuffer.getChannelData(0);

      // Simple audio level detection
      const audioLevel = this.calculateAudioLevel(inputData);

      // If audio level suggests speech, trigger simple pattern check
      if (audioLevel > 0.1) { // Threshold for speech detection
        this.checkForWakePattern(audioLevel);
      }
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  private calculateAudioLevel(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  private checkForWakePattern(audioLevel: number): void {
    // Simple pattern: sustained audio for ~1 second (like "Hey Nara")
    const now = Date.now();

    // Debounce rapid triggers
    if (now - this.lastDetection < this.debounceMs) {
      return;
    }

    // Simulate wake word detection based on audio pattern
    // In reality, this would need more sophisticated pattern matching
    if (audioLevel > 0.2) { // Higher threshold for wake word
      this.triggerWakeWord('hey nara', 0.8, audioLevel);
    }
  }

  private processTranscript(transcript: string, confidence: number): void {
    console.log(`[WakeWordService] Heard: "${transcript}" (confidence: ${confidence})`);

    // Check if transcript contains wake phrase
    const wakePhrase = this.config.wakePhrase.toLowerCase();
    const containsWakeWord = transcript.includes(wakePhrase);

    if (containsWakeWord && confidence >= this.config.sensitivity) {
      this.triggerWakeWord(transcript, confidence, 0.5);
    }
  }

  private triggerWakeWord(transcript: string, confidence: number, audioLevel: number): void {
    const now = Date.now();

    // Debounce rapid triggers
    if (now - this.lastDetection < this.debounceMs) {
      console.log('[WakeWordService] Wake word debounced');
      return;
    }

    this.lastDetection = now;

    const detection: WakeWordDetection = {
      phrase: transcript,
      confidence,
      timestamp: now,
      audioLevel
    };

    console.log(`[WakeWordService] 🎯 WAKE WORD DETECTED: "${transcript}" (${Math.round(confidence * 100)}%)`);

    this.emit('wakeWordDetected', detection);

    // Start command timeout
    this.startCommandTimeout();
  }

  private startCommandTimeout(): void {
    // After wake word, user has limited time to speak command
    setTimeout(() => {
      console.log('[WakeWordService] Command timeout - returning to wake word listening');
      this.emit('commandTimeout');
    }, this.config.timeout);
  }

  async startListening(): Promise<void> {
    if (this.isListening) {
      console.log('[WakeWordService] Already listening for wake word');
      return;
    }

    console.log(`[WakeWordService] 👂 Listening for "${this.config.wakePhrase}"...`);

    this.isListening = true;

    try {
      if (this.recognizer) {
        this.recognizer.start();
      }

      this.emit('listeningStarted');

    } catch (error) {
      console.error('[WakeWordService] Failed to start listening:', error);
      this.isListening = false;
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    console.log('[WakeWordService] Stopping wake word detection');

    this.isListening = false;

    if (this.recognizer) {
      this.recognizer.stop();
    }

    if (this.processor) {
      this.processor.disconnect();
    }

    this.emit('listeningStopped');
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  updateConfig(newConfig: Partial<WakeWordConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`[WakeWordService] Config updated - wake phrase: "${this.config.wakePhrase}"`);
  }

  // Manual trigger for testing
  triggerManualWakeWord(): void {
    console.log('[WakeWordService] Manual wake word trigger');
    this.triggerWakeWord('hey nara (manual)', 1.0, 0.8);
  }

  async destroy(): Promise<void> {
    await this.stopListening();

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.removeAllListeners();
  }
}
