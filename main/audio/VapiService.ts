/**
 * VapiService - Speech-to-Text integration via Vapi
 * Handles microphone capture and real-time transcription
 */

import { EventEmitter } from 'events';

export interface VapiConfig {
  apiKey: string;
  assistantId?: string; // Optional: if using Vapi assistant
  transcriptionModel: 'nova-2' | 'whisper'; // STT model
  language: string; // e.g., 'en-US'
  endpointUrl?: string; // Custom endpoint if needed
  // Wake word detection settings
  wakeWord?: {
    enabled: boolean;
    phrase: string; // "Hey Nara"
    sensitivity: number; // 0-1
  };
}

export interface VapiTranscription {
  text: string;
  isFinal: boolean; // true when transcription is complete
  confidence: number; // 0-1 confidence score
  timestamp: number;
  isWakeWord?: boolean; // true if this was a wake word detection
}

export interface VapiWakeWordDetection {
  phrase: string;
  confidence: number;
  timestamp: number;
}

export interface VapiSession {
  sessionId: string;
  isActive: boolean;
  startTime: number;
}

export class VapiService extends EventEmitter {
  private config: VapiConfig;
  private currentSession: VapiSession | null = null;
  private websocket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private isWakeWordMode = false; // true when listening for wake word only

  constructor(config: VapiConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log('[VapiService] Initializing Vapi STT service...');

    try {
      // Test API connection
      await this.validateApiKey();

      // Request microphone permissions
      await this.requestMicrophoneAccess();

      console.log('[VapiService] Vapi service ready');
      this.emit('ready');

    } catch (error) {
      console.error('[VapiService] Initialization failed:', error);
      throw error;
    }
  }

  private async validateApiKey(): Promise<void> {
    // Test Vapi API connection
    try {
      const response = await fetch('https://api.vapi.ai/assistant', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Vapi API error: ${response.status} ${response.statusText}`);
      }

      console.log('[VapiService] API key validated');

    } catch (error) {
      throw new Error(`Failed to validate Vapi API key: ${error}`);
    }
  }

  private async requestMicrophoneAccess(): Promise<void> {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Optimal for speech recognition
        }
      });

      console.log('[VapiService] Microphone access granted');

    } catch (error) {
      throw new Error(`Microphone access denied: ${error}`);
    }
  }

  async startListening(): Promise<VapiSession> {
    if (this.currentSession?.isActive) {
      throw new Error('Vapi session already active');
    }

    console.log('[VapiService] Starting speech recognition...');

    try {
      // Create new session
      this.currentSession = {
        sessionId: `vapi_${Date.now()}`,
        isActive: true,
        startTime: Date.now()
      };

      // Connect to Vapi WebSocket
      await this.connectWebSocket();

      // Start audio recording
      await this.startAudioCapture();

      this.emit('sessionStarted', this.currentSession);
      return this.currentSession;

    } catch (error) {
      console.error('[VapiService] Failed to start listening:', error);
      this.currentSession = null;
      throw error;
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `wss://api.vapi.ai/ws?apiKey=${this.config.apiKey}`;
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('[VapiService] WebSocket connected');

        // Send configuration
        this.websocket!.send(JSON.stringify({
          type: 'config',
          transcriptionModel: this.config.transcriptionModel,
          language: this.config.language
        }));

        resolve();
      };

      this.websocket.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };

      this.websocket.onerror = (error) => {
        console.error('[VapiService] WebSocket error:', error);
        reject(error);
      };

      this.websocket.onclose = () => {
        console.log('[VapiService] WebSocket disconnected');
        this.emit('sessionEnded');
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.websocket?.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'transcription':
          this.handleTranscription(message.data);
          break;

        case 'error':
          console.error('[VapiService] Server error:', message.error);
          this.emit('error', new Error(message.error));
          break;

        case 'session_end':
          this.handleSessionEnd();
          break;
      }

    } catch (error) {
      console.error('[VapiService] Failed to parse WebSocket message:', error);
    }
  }

    private handleTranscription(data: any): void {
    const transcription: VapiTranscription = {
      text: data.text,
      isFinal: data.is_final || false,
      confidence: data.confidence || 0,
      timestamp: Date.now(),
      isWakeWord: false
    };

    console.log(`[VapiService] Transcription: "${transcription.text}" (final: ${transcription.isFinal})`);

    // Check for wake word if in wake word mode
    if (this.isWakeWordMode && this.config.wakeWord?.enabled) {
      const isWakeWord = this.checkForWakeWord(transcription.text, transcription.confidence);
      if (isWakeWord) {
        transcription.isWakeWord = true;
        this.handleWakeWordDetection(transcription);
        return; // Don't emit regular transcription for wake words
      }
    }

    this.emit('transcription', transcription);

    // If final transcription, emit complete event
    if (transcription.isFinal) {
      this.emit('transcriptionComplete', transcription);
    }
  }

  private checkForWakeWord(text: string, confidence: number): boolean {
    if (!this.config.wakeWord?.enabled) return false;

    const wakePhrase = this.config.wakeWord.phrase.toLowerCase();
    const transcript = text.toLowerCase().trim();
    const sensitivity = this.config.wakeWord.sensitivity || 0.7;

    // Check if wake phrase is in the transcript with sufficient confidence
    return transcript.includes(wakePhrase) && confidence >= sensitivity;
  }

  private handleWakeWordDetection(transcription: VapiTranscription): void {
    const detection: VapiWakeWordDetection = {
      phrase: transcription.text,
      confidence: transcription.confidence,
      timestamp: transcription.timestamp
    };

    console.log(`[VapiService] 🎯 WAKE WORD DETECTED: "${detection.phrase}" (${Math.round(detection.confidence * 100)}%)`);

    this.emit('wakeWordDetected', detection);

    // Switch from wake word mode to full STT mode
    this.isWakeWordMode = false;
  }

  private async startAudioCapture(): Promise<void> {
    if (!this.audioStream) {
      throw new Error('No audio stream available');
    }

    // Create MediaRecorder to capture audio
    this.mediaRecorder = new MediaRecorder(this.audioStream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.websocket?.readyState === WebSocket.OPEN) {
        // Send audio data to Vapi
        this.websocket.send(event.data);
      }
    };

    // Send audio chunks every 100ms for real-time processing
    this.mediaRecorder.start(100);

    console.log('[VapiService] Audio capture started');
  }

  async stopListening(): Promise<string | null> {
    if (!this.currentSession?.isActive) {
      return null;
    }

    console.log('[VapiService] Stopping speech recognition...');

    try {
      // Stop audio recording
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }

      // Close WebSocket
      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }

      const sessionId = this.currentSession.sessionId;
      this.currentSession = null;

      this.emit('sessionStopped', sessionId);
      return sessionId;

    } catch (error) {
      console.error('[VapiService] Error stopping session:', error);
      throw error;
    }
  }

  private handleSessionEnd(): void {
    if (this.currentSession) {
      const duration = Date.now() - this.currentSession.startTime;
      console.log(`[VapiService] Session ended after ${duration}ms`);

      this.currentSession.isActive = false;
      this.emit('sessionEnded', this.currentSession);
    }
  }

  getCurrentSession(): VapiSession | null {
    return this.currentSession;
  }

  isListening(): boolean {
    return this.currentSession?.isActive || false;
  }

  // Quick transcription for testing
  async transcribeText(audioBlob: Blob): Promise<string> {
    console.log('[VapiService] Transcribing audio blob...');

    // This would upload audio directly to Vapi for transcription
    // Implementation depends on Vapi's direct transcription API

    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('model', this.config.transcriptionModel);
    formData.append('language', this.config.language);

    try {
      const response = await fetch('https://api.vapi.ai/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const result = await response.json();
      return result.text || '';

    } catch (error) {
      console.error('[VapiService] Transcription failed:', error);
      throw error;
    }
  }

    // Start listening specifically for wake word
  async startWakeWordListening(): Promise<void> {
    if (!this.config.wakeWord?.enabled) {
      throw new Error('Wake word detection not enabled in config');
    }

    console.log(`[VapiService] 👂 Starting wake word listening for "${this.config.wakeWord.phrase}"...`);

    this.isWakeWordMode = true;
    await this.startListening();
  }

  // Start listening for full command after wake word
  async startCommandListening(): Promise<VapiSession> {
    console.log('[VapiService] 🎙️ Starting command listening...');

    this.isWakeWordMode = false;
    return await this.startListening();
  }

  // Check if currently in wake word mode
  isInWakeWordMode(): boolean {
    return this.isWakeWordMode;
  }

  // Reset to wake word listening mode
  async resetToWakeWordMode(): Promise<void> {
    if (this.config.wakeWord?.enabled) {
      await this.stopListening();
      await this.startWakeWordListening();
    }
  }

  async destroy(): Promise<void> {
    await this.stopListening();

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    this.removeAllListeners();
  }
}
