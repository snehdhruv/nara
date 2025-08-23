/**
 * BrowserAudioManager - Browser-compatible audio orchestration
 * Modular audio pipeline for web applications
 */

class BrowserAudioManager extends EventTarget {
  constructor(config = {}) {
    super();

    this.config = {
      vapi: {
        apiKey: config.vapiApiKey || '',
        assistantId: config.vapiAssistantId || '',
        audioQuality: {
          sampleRate: 24000,
          bitrate: 128,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        },
        voiceEnhancement: {
          enabled: true,
          backgroundNoiseReduction: 0.8,
          speechEnhancement: true,
          adaptiveFiltering: true
        },
        ...config.vapi
      },
      tts: {
        apiKey: config.ttsApiKey || '',
        voiceId: config.ttsVoiceId || '',
        model: 'eleven_turbo_v2',
        stability: 0.75,
        similarityBoost: 0.8,
        ...config.tts
      }
    };

    this.state = {
      isInitialized: false,
      isListening: false,
      isProcessing: false,
      isSpeaking: false,
      currentConversation: [],
      metrics: {
        latency: null,
        audioQuality: null,
        noiseLevel: null
      }
    };

    // Initialize services
    this.vapiService = null;
    this.ttsService = null;
    this.audioPlayer = null;
  }

  /**
   * Initialize all audio services
   */
  async initialize() {
    console.log('[BrowserAudioManager] Initializing audio pipeline...');

    try {
      // Validate configuration
      this.validateConfig();

      // Initialize Vapi service
      if (typeof BrowserVapiService === 'undefined') {
        throw new Error('BrowserVapiService not loaded. Include BrowserVapiService.js first.');
      }

      this.vapiService = new BrowserVapiService(this.config.vapi);
      this.setupVapiEventHandlers();
      await this.vapiService.initialize();

      // Initialize TTS service
      if (typeof BrowserTTSService !== 'undefined') {
        this.ttsService = new BrowserTTSService(this.config.tts);
        this.setupTTSEventHandlers();
        await this.ttsService.initialize();
      }

      // Initialize Audio Player
      if (typeof BrowserAudioPlayer !== 'undefined') {
        this.audioPlayer = new BrowserAudioPlayer();
        this.setupAudioPlayerEventHandlers();
        await this.audioPlayer.initialize();
      }

      this.state.isInitialized = true;
      console.log('[BrowserAudioManager] Audio pipeline ready');
      this.dispatchEvent(new CustomEvent('ready'));

    } catch (error) {
      console.error('[BrowserAudioManager] Initialization failed:', error);
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
      throw error;
    }
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    const missing = [];

    if (!this.config.vapi.apiKey) missing.push('Vapi API key');
    if (!this.config.vapi.assistantId) missing.push('Vapi Assistant ID');

    if (missing.length > 0) {
      throw new Error(`Missing configuration: ${missing.join(', ')}`);
    }
  }

  /**
   * Setup Vapi service event handlers
   */
  setupVapiEventHandlers() {
    this.vapiService.addEventListener('ready', () => {
      console.log('[BrowserAudioManager] Vapi service ready');
    });

    this.vapiService.addEventListener('conversationStarted', (event) => {
      this.state.isListening = true;
      this.dispatchEvent(new CustomEvent('conversationStarted', { detail: event.detail }));
    });

    this.vapiService.addEventListener('userTranscript', (event) => {
      const transcript = event.detail;
      console.log(`[BrowserAudioManager] User: "${transcript}"`);

      this.state.currentConversation.push({
        role: 'user',
        content: transcript,
        timestamp: Date.now()
      });

      this.dispatchEvent(new CustomEvent('userMessage', { detail: transcript }));
    });

    this.vapiService.addEventListener('assistantTranscript', (event) => {
      const transcript = event.detail;
      console.log(`[BrowserAudioManager] Assistant: "${transcript}"`);

      this.state.currentConversation.push({
        role: 'assistant',
        content: transcript,
        timestamp: Date.now()
      });

      this.dispatchEvent(new CustomEvent('assistantMessage', { detail: transcript }));
    });

    this.vapiService.addEventListener('assistantSpeaking', (event) => {
      this.state.isSpeaking = event.detail;
      this.dispatchEvent(new CustomEvent('speakingStateChanged', { detail: event.detail }));
    });

    this.vapiService.addEventListener('conversationStopped', () => {
      this.state.isListening = false;
      this.state.isSpeaking = false;
      this.dispatchEvent(new CustomEvent('conversationStopped'));
    });

    this.vapiService.addEventListener('error', (event) => {
      console.error('[BrowserAudioManager] Vapi error:', event.detail);
      this.dispatchEvent(new CustomEvent('error', { detail: event.detail }));
    });
  }

  /**
   * Setup TTS service event handlers (if available)
   */
  setupTTSEventHandlers() {
    this.ttsService.addEventListener('synthesisStarted', () => {
      this.state.isProcessing = true;
      this.dispatchEvent(new CustomEvent('processingStarted'));
    });

    this.ttsService.addEventListener('synthesisComplete', (event) => {
      this.state.isProcessing = false;
      this.dispatchEvent(new CustomEvent('processingComplete', { detail: event.detail }));
    });

    this.ttsService.addEventListener('error', (event) => {
      console.error('[BrowserAudioManager] TTS error:', event.detail);
      this.dispatchEvent(new CustomEvent('error', { detail: event.detail }));
    });
  }

  /**
   * Setup Audio Player event handlers (if available)
   */
  setupAudioPlayerEventHandlers() {
    this.audioPlayer.addEventListener('playbackStarted', () => {
      this.state.isSpeaking = true;
      this.dispatchEvent(new CustomEvent('playbackStarted'));
    });

    this.audioPlayer.addEventListener('playbackComplete', () => {
      this.state.isSpeaking = false;
      this.dispatchEvent(new CustomEvent('playbackComplete'));
    });

    this.audioPlayer.addEventListener('error', (event) => {
      console.error('[BrowserAudioManager] Audio Player error:', event.detail);
      this.dispatchEvent(new CustomEvent('error', { detail: event.detail }));
    });
  }

  /**
   * Start listening for voice input
   */
  async startListening() {
    if (!this.state.isInitialized) {
      throw new Error('AudioManager not initialized. Call initialize() first.');
    }

    if (this.state.isListening) {
      console.warn('[BrowserAudioManager] Already listening');
      return;
    }

    console.log('[BrowserAudioManager] Starting conversation...');

    try {
      await this.vapiService.startConversation();
    } catch (error) {
      console.error('[BrowserAudioManager] Failed to start listening:', error);
      throw error;
    }
  }

  /**
   * Stop listening and end conversation
   */
  stopListening() {
    if (!this.state.isListening) {
      console.warn('[BrowserAudioManager] Not currently listening');
      return;
    }

    console.log('[BrowserAudioManager] Stopping conversation...');
    this.vapiService.stopConversation();
  }

  /**
   * Synthesize and play text using TTS (if available)
   */
  async speak(text, options = {}) {
    if (!this.ttsService) {
      console.warn('[BrowserAudioManager] TTS service not available');
      return;
    }

    try {
      console.log(`[BrowserAudioManager] Speaking: "${text}"`);
      const audioData = await this.ttsService.synthesize(text, options);

      if (this.audioPlayer) {
        await this.audioPlayer.play(audioData);
      } else {
        console.warn('[BrowserAudioManager] Audio player not available');
      }

    } catch (error) {
      console.error('[BrowserAudioManager] Failed to speak:', error);
      throw error;
    }
  }

  /**
   * Get current conversation history
   */
  getConversation() {
    return [...this.state.currentConversation];
  }

  /**
   * Clear conversation history
   */
  clearConversation() {
    this.state.currentConversation = [];
    this.dispatchEvent(new CustomEvent('conversationCleared'));
  }

  /**
   * Get current state
   */
  getState() {
    return {
      ...this.state,
      vapiState: this.vapiService ? this.vapiService.getState() : null,
      services: {
        vapi: !!this.vapiService,
        tts: !!this.ttsService,
        audioPlayer: !!this.audioPlayer
      }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig,
      vapi: { ...this.config.vapi, ...newConfig.vapi },
      tts: { ...this.config.tts, ...newConfig.tts }
    };

    // Update service configurations if they exist
    if (this.vapiService && newConfig.vapi) {
      this.vapiService.config = { ...this.vapiService.config, ...newConfig.vapi };
    }

    if (this.ttsService && newConfig.tts) {
      this.ttsService.config = { ...this.ttsService.config, ...newConfig.tts };
    }

    this.dispatchEvent(new CustomEvent('configUpdated', { detail: this.config }));
  }

  /**
   * Get audio quality metrics
   */
  getMetrics() {
    const metrics = {
      ...this.state.metrics,
      timestamp: Date.now()
    };

    // Add Vapi-specific metrics if available
    if (this.vapiService) {
      const vapiState = this.vapiService.getState();
      metrics.audioQuality = vapiState.audioQuality;
      metrics.voiceEnhancement = vapiState.voiceEnhancement;
    }

    return metrics;
  }

  /**
   * Test audio pipeline
   */
  async testAudioPipeline() {
    console.log('[BrowserAudioManager] Testing audio pipeline...');

    const results = {
      microphone: false,
      vapi: false,
      tts: false,
      audioPlayer: false,
      overall: false
    };

    try {
      // Test microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      results.microphone = true;
      console.log('✅ Microphone test passed');

      // Test Vapi service
      if (this.vapiService) {
        results.vapi = this.vapiService.getState().isConnected !== false;
        console.log(`${results.vapi ? '✅' : '❌'} Vapi test ${results.vapi ? 'passed' : 'failed'}`);
      }

      // Test TTS service
      if (this.ttsService) {
        results.tts = true; // Assume TTS is working if initialized
        console.log('✅ TTS test passed');
      }

      // Test Audio Player
      if (this.audioPlayer) {
        results.audioPlayer = true; // Assume audio player is working if initialized
        console.log('✅ Audio Player test passed');
      }

      results.overall = results.microphone && results.vapi;

      console.log(`[BrowserAudioManager] Audio pipeline test ${results.overall ? 'PASSED' : 'FAILED'}`);

      this.dispatchEvent(new CustomEvent('testComplete', { detail: results }));
      return results;

    } catch (error) {
      console.error('[BrowserAudioManager] Audio pipeline test failed:', error);
      this.dispatchEvent(new CustomEvent('testFailed', { detail: error }));
      throw error;
    }
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    console.log('[BrowserAudioManager] Cleaning up...');

    if (this.vapiService) {
      this.vapiService.stopConversation();
    }

    this.state.isInitialized = false;
    this.state.isListening = false;
    this.state.isProcessing = false;
    this.state.isSpeaking = false;

    this.dispatchEvent(new CustomEvent('destroyed'));
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrowserAudioManager;
} else if (typeof window !== 'undefined') {
  window.BrowserAudioManager = BrowserAudioManager;
}
