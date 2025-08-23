/**
 * BrowserTTSService - Browser-compatible ElevenLabs TTS integration
 * Modular TTS service for web applications
 */

class BrowserTTSService extends EventTarget {
  constructor(config) {
    super();

    this.config = {
      apiKey: config.apiKey || '',
      voiceId: config.voiceId || '',
      model: config.model || 'eleven_turbo_v2',
      stability: config.stability || 0.75,
      similarityBoost: config.similarityBoost || 0.8,
      style: config.style || 0.2,
      useSpeakerBoost: config.useSpeakerBoost || true,
      // Enhanced audio settings
      outputFormat: config.outputFormat || 'mp3_44100_128',
      optimizeStreamingLatency: config.optimizeStreamingLatency || 3,
      ...config
    };

    this.isInitialized = false;
    this.isSynthesizing = false;
    this.audioContext = null;
  }

  /**
   * Initialize the TTS service
   */
  async initialize() {
    console.log('[BrowserTTSService] Initializing TTS service...');

    try {
      // Validate API key
      await this.validateApiKey();

      // Initialize Web Audio API context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      this.isInitialized = true;
      console.log('[BrowserTTSService] TTS service ready');
      this.dispatchEvent(new CustomEvent('ready'));

    } catch (error) {
      console.error('[BrowserTTSService] Initialization failed:', error);
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
      throw error;
    }
  }

  /**
   * Validate ElevenLabs API key
   */
  async validateApiKey() {
    if (!this.config.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/user', {
        method: 'GET',
        headers: {
          'xi-api-key': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`API key validation failed: ${response.status}`);
      }

      console.log('[BrowserTTSService] API key validated');

    } catch (error) {
      throw new Error(`Failed to validate ElevenLabs API key: ${error.message}`);
    }
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(text, options = {}) {
    if (!this.isInitialized) {
      throw new Error('TTS service not initialized. Call initialize() first.');
    }

    if (this.isSynthesizing) {
      console.warn('[BrowserTTSService] Already synthesizing. Queuing request...');
    }

    console.log(`[BrowserTTSService] Synthesizing: "${text.substring(0, 50)}..."`);

    try {
      this.isSynthesizing = true;
      this.dispatchEvent(new CustomEvent('synthesisStarted', { detail: { text } }));

      // Prepare voice settings
      const voiceSettings = {
        stability: options.stability || this.config.stability,
        similarity_boost: options.similarityBoost || this.config.similarityBoost,
        style: options.style || this.config.style,
        use_speaker_boost: options.useSpeakerBoost || this.config.useSpeakerBoost
      };

      // Make TTS request
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.config.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.config.apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: this.config.model,
          voice_settings: voiceSettings,
          output_format: this.config.outputFormat,
          optimize_streaming_latency: this.config.optimizeStreamingLatency
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS synthesis failed: ${response.status} - ${errorText}`);
      }

      // Get audio data
      const audioArrayBuffer = await response.arrayBuffer();

      // Convert to AudioBuffer for Web Audio API
      const audioBuffer = await this.audioContext.decodeAudioData(audioArrayBuffer);

      const result = {
        audioBuffer,
        audioArrayBuffer,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        text: text,
        voiceSettings: voiceSettings
      };

      this.isSynthesizing = false;
      this.dispatchEvent(new CustomEvent('synthesisComplete', { detail: result }));

      console.log(`[BrowserTTSService] Synthesis complete: ${audioBuffer.duration.toFixed(2)}s`);
      return result;

    } catch (error) {
      this.isSynthesizing = false;
      console.error('[BrowserTTSService] Synthesis failed:', error);
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
      throw error;
    }
  }

  /**
   * Synthesize and play text immediately
   */
  async speak(text, options = {}) {
    try {
      const result = await this.synthesize(text, options);
      await this.playAudio(result.audioBuffer);
      return result;

    } catch (error) {
      console.error('[BrowserTTSService] Speak failed:', error);
      throw error;
    }
  }

  /**
   * Play audio buffer using Web Audio API
   */
  async playAudio(audioBuffer) {
    return new Promise((resolve, reject) => {
      try {
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);

        source.onended = () => {
          this.dispatchEvent(new CustomEvent('playbackComplete'));
          resolve();
        };

        source.onerror = (error) => {
          this.dispatchEvent(new CustomEvent('playbackError', { detail: error }));
          reject(error);
        };

        this.dispatchEvent(new CustomEvent('playbackStarted'));
        source.start(0);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get available voices
   */
  async getVoices() {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        method: 'GET',
        headers: {
          'xi-api-key': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get voices: ${response.status}`);
      }

      const data = await response.json();
      return data.voices;

    } catch (error) {
      console.error('[BrowserTTSService] Failed to get voices:', error);
      throw error;
    }
  }

  /**
   * Get voice details
   */
  async getVoiceDetails(voiceId = null) {
    const targetVoiceId = voiceId || this.config.voiceId;

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/voices/${targetVoiceId}`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get voice details: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('[BrowserTTSService] Failed to get voice details:', error);
      throw error;
    }
  }

  /**
   * Test TTS with a short phrase
   */
  async testTTS() {
    console.log('[BrowserTTSService] Testing TTS...');

    try {
      const testText = "Hello, this is a test of the text-to-speech system.";
      const result = await this.synthesize(testText);

      console.log(`[BrowserTTSService] TTS test successful: ${result.duration.toFixed(2)}s audio generated`);

      this.dispatchEvent(new CustomEvent('testComplete', {
        detail: {
          success: true,
          duration: result.duration,
          sampleRate: result.sampleRate
        }
      }));

      return result;

    } catch (error) {
      console.error('[BrowserTTSService] TTS test failed:', error);

      this.dispatchEvent(new CustomEvent('testFailed', { detail: error }));
      throw error;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.dispatchEvent(new CustomEvent('configUpdated', { detail: this.config }));
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      isSynthesizing: this.isSynthesizing,
      config: { ...this.config, apiKey: '***' }, // Hide API key
      audioContextState: this.audioContext ? this.audioContext.state : null
    };
  }

  /**
   * Stop current synthesis (if possible)
   */
  stop() {
    // Note: HTTP requests can't be easily cancelled, but we can ignore results
    this.isSynthesizing = false;
    this.dispatchEvent(new CustomEvent('synthesisStopped'));
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    console.log('[BrowserTTSService] Cleaning up...');

    this.stop();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isInitialized = false;
    this.dispatchEvent(new CustomEvent('destroyed'));
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrowserTTSService;
} else if (typeof window !== 'undefined') {
  window.BrowserTTSService = BrowserTTSService;
}
