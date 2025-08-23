/**
 * BrowserVapiService - Browser-compatible Vapi integration
 * Modular version of VapiService for web applications
 */

class BrowserVapiService extends EventTarget {
  constructor(config) {
    super();

    // Set default enhanced audio configuration
    this.config = {
      ...config,
      audioQuality: {
        sampleRate: 24000,
        bitrate: 128,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        ...config.audioQuality
      },
      voiceEnhancement: {
        enabled: true,
        backgroundNoiseReduction: 0.8,
        speechEnhancement: true,
        adaptiveFiltering: true,
        ...config.voiceEnhancement
      }
    };

    this.websocket = null;
    this.audioStream = null;
    this.audioContext = null;
    this.audioProcessor = null;
    this.audioSource = null;
    this.isListening = false;
    this.isAssistantSpeaking = false;

    // Audio enhancement buffers
    this.audioChunkBuffer = [];
    this.nextPlayTime = 0;
    this.isPlayingAudio = false;
  }

  /**
   * Initialize the service and request microphone access
   */
  async initialize() {
    console.log('[BrowserVapiService] Initializing...');

    try {
      // Request microphone access with enhanced settings
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.audioQuality.sampleRate,
          channelCount: this.config.audioQuality.channelCount,
          echoCancellation: this.config.audioQuality.echoCancellation,
          noiseSuppression: this.config.audioQuality.noiseSuppression,
          autoGainControl: this.config.audioQuality.autoGainControl
        }
      });

      console.log('[BrowserVapiService] Microphone access granted');
      this.dispatchEvent(new CustomEvent('ready'));

    } catch (error) {
      console.error('[BrowserVapiService] Initialization failed:', error);
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
      throw error;
    }
  }

  /**
   * Start conversation with enhanced audio processing
   */
  async startConversation() {
    if (this.isListening) {
      console.warn('[BrowserVapiService] Already listening');
      return;
    }

    console.log('[BrowserVapiService] Starting conversation...');

    try {
      // Create Vapi call with enhanced audio settings
      const response = await fetch('https://api.vapi.ai/call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assistantId: this.config.assistantId,
          transport: {
            provider: 'vapi.websocket'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[BrowserVapiService] Vapi API error:', errorText);
        throw new Error(`Failed to create call: ${response.status} - ${errorText}`);
      }

      const callData = await response.json();
      console.log(`[BrowserVapiService] Call created: ${callData.id}`);

      // Connect to WebSocket
      await this.connectWebSocket(callData.transport.websocketCallUrl);

      // Start enhanced audio streaming
      this.startEnhancedAudioStreaming();

      this.isListening = true;
      this.dispatchEvent(new CustomEvent('conversationStarted', { detail: callData }));

    } catch (error) {
      console.error('[BrowserVapiService] Failed to start conversation:', error);
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
      throw error;
    }
  }

  /**
   * Connect to Vapi WebSocket with message handling
   */
  async connectWebSocket(websocketUrl) {
    return new Promise((resolve, reject) => {
      this.websocket = new WebSocket(websocketUrl);

      this.websocket.onopen = () => {
        console.log('[BrowserVapiService] WebSocket connected');
        resolve();
      };

      this.websocket.onmessage = (event) => {
        this.handleVapiMessage(event.data);
      };

      this.websocket.onerror = (error) => {
        console.error('[BrowserVapiService] WebSocket error:', error);
        reject(error);
      };

      this.websocket.onclose = (event) => {
        console.log(`[BrowserVapiService] WebSocket closed: ${event.code}`);
        this.stopConversation();
      };
    });
  }

  /**
   * Enhanced audio streaming with voice processing
   */
  startEnhancedAudioStreaming() {
    try {
      // Create audio context with enhanced sample rate
      this.audioContext = new AudioContext({ sampleRate: this.config.audioQuality.sampleRate });
      this.audioSource = this.audioContext.createMediaStreamSource(this.audioStream);

      // Create script processor with optimized buffer size
      const bufferSize = this.calculateOptimalBufferSize();
      this.audioProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.audioProcessor.onaudioprocess = (event) => {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
          const inputBuffer = event.inputBuffer.getChannelData(0);

          // Apply voice enhancement if enabled
          let processedBuffer = inputBuffer;
          if (this.config.voiceEnhancement.enabled) {
            processedBuffer = this.applyVoiceEnhancement(inputBuffer);
          }

          // Convert to PCM and send
          const pcmBuffer = this.convertToPCM(processedBuffer);
          this.websocket.send(pcmBuffer.buffer);
        }
      };

      // Connect audio nodes
      this.audioSource.connect(this.audioProcessor);
      this.audioProcessor.connect(this.audioContext.destination);

      console.log('[BrowserVapiService] Enhanced audio streaming started');

    } catch (error) {
      console.error('[BrowserVapiService] Failed to start audio streaming:', error);
      throw error;
    }
  }

  /**
   * Calculate optimal buffer size based on sample rate
   */
  calculateOptimalBufferSize() {
    const sampleRate = this.config.audioQuality.sampleRate;

    // Target 20-50ms latency
    if (sampleRate >= 48000) return 2048; // ~43ms at 48kHz
    if (sampleRate >= 24000) return 1024; // ~43ms at 24kHz
    return 512; // ~32ms at 16kHz
  }

  /**
   * Apply voice enhancement processing
   */
  applyVoiceEnhancement(audioData) {
    let enhanced = new Float32Array(audioData);

    // Apply noise reduction
    if (this.config.voiceEnhancement.backgroundNoiseReduction > 0) {
      enhanced = this.applyNoiseReduction(enhanced);
    }

    // Apply speech enhancement
    if (this.config.voiceEnhancement.speechEnhancement) {
      enhanced = this.applySpeechEnhancement(enhanced);
    }

    // Apply adaptive filtering
    if (this.config.voiceEnhancement.adaptiveFiltering) {
      enhanced = this.applyAdaptiveFiltering(enhanced);
    }

    return enhanced;
  }

  /**
   * Simple noise reduction using threshold gating
   */
  applyNoiseReduction(samples) {
    const strength = this.config.voiceEnhancement.backgroundNoiseReduction;
    const threshold = 0.01 * (1 - strength);

    const processed = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      if (Math.abs(samples[i]) < threshold) {
        processed[i] = samples[i] * (1 - strength);
      } else {
        processed[i] = samples[i];
      }
    }

    return processed;
  }

  /**
   * Speech enhancement using dynamic range compression
   */
  applySpeechEnhancement(samples) {
    const compressionRatio = 0.3;
    const threshold = 0.5;

    const processed = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const amplitude = Math.abs(samples[i]);
      if (amplitude > threshold) {
        const excess = amplitude - threshold;
        const compressedExcess = excess * compressionRatio;
        processed[i] = Math.sign(samples[i]) * (threshold + compressedExcess);
      } else {
        processed[i] = samples[i];
      }
    }

    return processed;
  }

  /**
   * Adaptive filtering using moving average
   */
  applyAdaptiveFiltering(samples) {
    const windowSize = 3;
    const filtered = new Float32Array(samples.length);

    for (let i = 0; i < samples.length; i++) {
      let sum = 0;
      let count = 0;

      for (let j = Math.max(0, i - windowSize); j <= Math.min(samples.length - 1, i + windowSize); j++) {
        sum += samples[j];
        count++;
      }

      filtered[i] = sum / count;
    }

    return filtered;
  }

  /**
   * Convert Float32Array to Int16Array PCM
   */
  convertToPCM(inputBuffer) {
    const pcmBuffer = new Int16Array(inputBuffer.length);
    for (let i = 0; i < inputBuffer.length; i++) {
      pcmBuffer[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32768));
    }
    return pcmBuffer;
  }

  /**
   * Handle incoming Vapi messages
   */
  handleVapiMessage(data) {
    try {
      // Handle binary audio data
      if (data instanceof ArrayBuffer || data instanceof Blob) {
        const size = data.byteLength || data.size || 0;

        if (this.isAssistantSpeaking && size > 100) {
          this.playAudioData(data);
        }
        return;
      }

      // Handle JSON messages
      const message = JSON.parse(data);

      switch (message.type) {
        case 'transcript':
          if (message.role === 'user' && message.transcriptType === 'final') {
            this.dispatchEvent(new CustomEvent('userTranscript', { detail: message.transcript }));
          } else if (message.role === 'assistant') {
            this.dispatchEvent(new CustomEvent('assistantTranscript', { detail: message.transcript }));
          }
          break;

        case 'speech-update':
          if (message.role === 'assistant') {
            this.isAssistantSpeaking = message.status === 'started';
            this.dispatchEvent(new CustomEvent('assistantSpeaking', { detail: this.isAssistantSpeaking }));
          }
          break;

        case 'conversation-update':
          this.dispatchEvent(new CustomEvent('conversationUpdate', { detail: message.conversation }));
          break;

        case 'model-output':
          this.dispatchEvent(new CustomEvent('modelOutput', { detail: message.output }));
          break;

        case 'user-interrupted':
          this.dispatchEvent(new CustomEvent('userInterrupted'));
          break;

        case 'error':
          this.dispatchEvent(new CustomEvent('error', { detail: message.error }));
          break;
      }

    } catch (error) {
      console.error('[BrowserVapiService] Failed to parse message:', error);
    }
  }

  /**
   * Play audio data with enhanced buffering
   */
  async playAudioData(audioData) {
    try {
      // Initialize playback audio context if needed
      if (!this.playbackAudioContext) {
        this.playbackAudioContext = new AudioContext({ sampleRate: 24000 });
        this.nextPlayTime = this.playbackAudioContext.currentTime;
      }

      // Convert to ArrayBuffer
      let arrayBuffer;
      if (audioData instanceof ArrayBuffer) {
        arrayBuffer = audioData;
      } else if (audioData instanceof Blob) {
        arrayBuffer = await audioData.arrayBuffer();
      }

      // Add to buffer for smooth playback
      this.audioChunkBuffer.push(arrayBuffer);

      if (!this.isPlayingAudio) {
        this.processAudioBuffer();
      }

    } catch (error) {
      console.error('[BrowserVapiService] Failed to play audio:', error);
    }
  }

  /**
   * Process buffered audio chunks for smooth playback
   */
  async processAudioBuffer() {
    if (this.audioChunkBuffer.length === 0 || this.isPlayingAudio) {
      return;
    }

    this.isPlayingAudio = true;

    try {
      const chunksToProcess = this.audioChunkBuffer.splice(0, Math.min(3, this.audioChunkBuffer.length));

      for (const arrayBuffer of chunksToProcess) {
        if (arrayBuffer.byteLength > 0) {
          await this.playPCMAudio(arrayBuffer);
        }
      }

      // Continue processing if more chunks available
      if (this.audioChunkBuffer.length > 0) {
        setTimeout(() => {
          this.isPlayingAudio = false;
          this.processAudioBuffer();
        }, 50);
      } else {
        this.isPlayingAudio = false;
      }

    } catch (error) {
      this.isPlayingAudio = false;
      console.error('[BrowserVapiService] Audio processing error:', error);
    }
  }

  /**
   * Play PCM audio using Web Audio API
   */
  async playPCMAudio(arrayBuffer) {
    try {
      // Convert PCM data to AudioBuffer
      const int16Array = new Int16Array(arrayBuffer);
      const float32Array = new Float32Array(int16Array.length);

      // Convert Int16 PCM to Float32
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      // Create AudioBuffer
      const audioBuffer = this.playbackAudioContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      // Schedule playback
      const source = this.playbackAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.playbackAudioContext.destination);

      const playTime = Math.max(this.playbackAudioContext.currentTime, this.nextPlayTime);
      source.start(playTime);
      this.nextPlayTime = playTime + audioBuffer.duration;

    } catch (error) {
      console.error('[BrowserVapiService] PCM playback failed:', error);
    }
  }

  /**
   * Stop conversation and cleanup
   */
  stopConversation() {
    console.log('[BrowserVapiService] Stopping conversation...');

    // Reset audio state
    this.audioChunkBuffer = [];
    this.isPlayingAudio = false;
    this.isAssistantSpeaking = false;
    this.nextPlayTime = this.playbackAudioContext ? this.playbackAudioContext.currentTime : 0;

    // Cleanup audio processing
    if (this.audioProcessor) {
      this.audioProcessor.disconnect();
      this.audioProcessor = null;
    }

    if (this.audioSource) {
      this.audioSource.disconnect();
      this.audioSource = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Close WebSocket
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.isListening = false;
    this.dispatchEvent(new CustomEvent('conversationStopped'));
  }

  /**
   * Get current service state
   */
  getState() {
    return {
      isListening: this.isListening,
      isAssistantSpeaking: this.isAssistantSpeaking,
      isConnected: this.websocket && this.websocket.readyState === WebSocket.OPEN,
      audioQuality: this.config.audioQuality,
      voiceEnhancement: this.config.voiceEnhancement
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrowserVapiService;
} else if (typeof window !== 'undefined') {
  window.BrowserVapiService = BrowserVapiService;
}
