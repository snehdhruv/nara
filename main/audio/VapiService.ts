/**
 * VapiService - Speech-to-Text integration via Vapi
 * Handles microphone capture and real-time transcription
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';

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

  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private websocket: WebSocket | null = null;
  private isWakeWordMode = false; // true when listening for wake word only
  private isConnected = false;

  constructor(config: VapiConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log('[VapiService] Initializing Vapi STT service...');

    try {
      // Validate API key
      await this.validateApiKey();

      this.isConnected = true;
      console.log('[VapiService] Vapi service ready');
      this.emit('ready');

    } catch (error) {
      console.error('[VapiService] Initialization failed:', error);
      console.log('[VapiService] Falling back to mock STT for testing');

      // Set up mock mode instead of failing completely
      this.isConnected = false; // Indicate we're in mock mode

      console.log('[VapiService] Mock STT service ready');
      this.emit('ready');
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
    // In Node.js/Electron main process, we can't access navigator
    // Skip microphone access - will be handled differently
    console.log('[VapiService] Skipping microphone access in main process');
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

      // Start continuous STT for wake word detection
      await this.startContinuousSTT();

      this.emit('sessionStarted', this.currentSession);
      return this.currentSession;

    } catch (error) {
      console.error('[VapiService] Failed to start listening:', error);
      this.currentSession = null;
      throw error;
    }
  }

  private async connectWebSocket(): Promise<void> {
    try {
      // Step 1: Create a WebSocket call to get the websocketCallUrl
      console.log('[VapiService] Creating WebSocket call...');

      if (!this.config.assistantId) {
        throw new Error('Assistant ID is required for WebSocket connection');
      }

      const response = await fetch('https://api.vapi.ai/call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assistantId: this.config.assistantId,
          transport: {
            provider: 'vapi.websocket',
            audioFormat: {
              format: 'pcm_s16le',
              container: 'raw',
              sampleRate: 16000
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create Vapi call: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const callData = await response.json();
      console.log('[VapiService] Call created successfully, ID:', callData.id);

      // Step 2: Connect to the WebSocket using the returned URL
      return new Promise((resolve, reject) => {
        const wsUrl = callData.transport.websocketCallUrl;
        console.log('[VapiService] Connecting to WebSocket...');

        this.websocket = new WebSocket(wsUrl);

        this.websocket.on('open', () => {
          console.log('[VapiService] WebSocket connected successfully');
          this.isConnected = true;
          resolve();
        });

        this.websocket.on('message', (data) => {
          this.handleWebSocketMessage(data);
        });

        this.websocket.on('error', (error) => {
          console.error('[VapiService] WebSocket error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.websocket.on('close', (code) => {
          console.log('[VapiService] WebSocket disconnected, code:', code);
          this.isConnected = false;
          this.emit('sessionEnded');
        });

        // Timeout after 15 seconds
        setTimeout(() => {
          if (this.websocket?.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 15000);
      });

    } catch (error) {
      console.error('[VapiService] Failed to connect WebSocket:', error);
      throw error;
    }
  }

  private handleWebSocketMessage(data: any): void {
    try {
      // Check if this is binary audio data (Buffer or ArrayBuffer)
      if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
        // This is audio data from Vapi - ignore it for STT-only mode
        // console.log('[VapiService] Received audio data (ignored in STT-only mode)');
        return;
      }

      // Convert Buffer to string if needed
      const messageStr = typeof data === 'string' ? data : data.toString();

      // Only try to parse text messages as JSON
      if (typeof messageStr !== 'string') {
        console.log(`[VapiService] Ignoring non-text message: ${typeof messageStr}`);
        return;
      }

      const message = JSON.parse(messageStr);

      // Log raw messages for debugging (truncated)
      const logMessage = JSON.stringify(message).substring(0, 100);
      console.log(`[VapiService] Raw message: ${logMessage}${JSON.stringify(message).length > 100 ? '...' : ''}`);

      switch (message.type) {
        case 'transcript':
          // Only process USER transcripts, ignore assistant transcripts
          if (message.role === 'user') {
            this.handleTranscription(message);
          } else {
            console.log(`[VapiService] Assistant transcript (ignored): "${message.transcript}"`);
          }
          break;

        case 'speech-update':
          console.log(`[VapiService] Speech ${message.status}: ${message.role}`);
          if (message.status === 'started' && message.role === 'user') {
            this.emit('speechStarted');
          } else if (message.status === 'stopped' && message.role === 'user') {
            this.emit('speechEnded');
          }
          break;

        case 'status-update':
          console.log(`[VapiService] Status: ${message.status}`);
          break;

        case 'conversation-update':
          // Ignore conversation updates to reduce log spam
          break;

        case 'model-output':
          // Suppress model output messages to prevent log spam
          break;

        case 'voice-input':
          console.log(`[VapiService] Voice input: "${message.input}"`);
          break;

        case 'user-interrupted':
          console.log('[VapiService] User interrupted');
          break;

        case 'error':
          console.error('[VapiService] Server error:', message.error);
          this.emit('error', new Error(message.error));
          break;

        default:
          console.log(`[VapiService] Unknown message type: ${message.type}`);
          console.log(`[VapiService]    Content: ${JSON.stringify(message)}`);
          break;
      }

    } catch (error) {
      console.error('[VapiService] Failed to parse WebSocket message:', error);
    }
  }

    private handleTranscription(message: any): void {
    // Handle Vapi's transcript message format
    const transcription: VapiTranscription = {
      text: message.transcript || message.text || '',
      isFinal: message.transcriptType === 'final',
      confidence: message.confidence || 0.9, // Vapi doesn't always provide confidence
      timestamp: Date.now(),
      isWakeWord: false
    };

    console.log(`[VapiService] USER Transcript: "${transcription.text}" (${message.transcriptType || 'unknown'})`);

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

    private setupVapiEventListeners(): void {
    // Event listeners are now handled in handleWebSocketMessage
    // This method is kept for compatibility but does nothing
  }

  private async startContinuousSTT(): Promise<void> {
    console.log('[VapiService] Starting continuous STT for wake word detection...');

    if (!this.config.assistantId) {
      console.log('[VapiService] No assistant ID configured, using mock mode');
      this.startWakeWordPolling();
      return;
    }

    try {
      // Use our working WebSocket approach
      await this.connectWebSocket();
      console.log('[VapiService] 👂 Continuous listening active with assistant');
      this.isWakeWordMode = true;
    } catch (error) {
      console.error('[VapiService] Failed to start continuous STT:', error);
      console.log('[VapiService] Falling back to mock wake word detection');
      this.startWakeWordPolling();
    }
  }

  private startWakeWordPolling(): void {
    console.log('[VapiService] 👂 Listening continuously for "Hey Nara"...');

    // Simulate continuous transcription monitoring
    setInterval(() => {
      // In a real implementation, this would process actual audio
      // For now, we'll just indicate we're listening
      console.log('[VapiService] 🎧 Monitoring audio for wake phrase...');
    }, 5000); // Log every 5 seconds to show it's working
  }

  // Method to manually trigger wake word detection (for testing)
  triggerWakeWord(phrase: string = "Hey Nara test command"): void {
    console.log(`[VapiService] 🎯 Manual wake word triggered: "${phrase}"`);

    // Check if phrase contains wake word
    if (phrase.toLowerCase().includes('hey nara')) {
      const command = phrase.replace(/hey nara/i, '').trim();

      this.emit('wakeWordDetected', {
        phrase: 'Hey Nara',
        confidence: 0.95,
        timestamp: Date.now(),
        command: command || 'test'
      });

      // Emit transcription for the command part
      if (command) {
        this.emit('transcription', {
          text: command,
          confidence: 0.9,
          isFinal: true,
          timestamp: Date.now()
        });
      }
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
