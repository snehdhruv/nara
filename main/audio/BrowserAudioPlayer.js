/**
 * BrowserAudioPlayer - Web Audio API based audio playback
 * Enhanced audio player for browser applications
 */

class BrowserAudioPlayer extends EventTarget {
  constructor(config = {}) {
    super();

    this.config = {
      volume: config.volume || 1.0,
      fadeInDuration: config.fadeInDuration || 0.1,
      fadeOutDuration: config.fadeOutDuration || 0.1,
      bufferSize: config.bufferSize || 4096,
      enableEffects: config.enableEffects || false,
      ...config
    };

    this.audioContext = null;
    this.gainNode = null;
    this.currentSource = null;
    this.isPlaying = false;
    this.isInitialized = false;
    this.playbackQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Initialize the audio player
   */
  async initialize() {
    console.log('[BrowserAudioPlayer] Initializing audio player...');

    try {
      // Create Web Audio API context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.config.volume;
      this.gainNode.connect(this.audioContext.destination);

      // Handle audio context state changes
      this.audioContext.addEventListener('statechange', () => {
        console.log(`[BrowserAudioPlayer] Audio context state: ${this.audioContext.state}`);
        this.dispatchEvent(new CustomEvent('contextStateChanged', {
          detail: this.audioContext.state
        }));
      });

      this.isInitialized = true;
      console.log('[BrowserAudioPlayer] Audio player ready');
      this.dispatchEvent(new CustomEvent('ready'));

    } catch (error) {
      console.error('[BrowserAudioPlayer] Initialization failed:', error);
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
      throw error;
    }
  }

  /**
   * Play audio from various sources
   */
  async play(audioSource, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Audio player not initialized. Call initialize() first.');
    }

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    try {
      let audioBuffer;

      // Handle different audio source types
      if (audioSource instanceof AudioBuffer) {
        audioBuffer = audioSource;
      } else if (audioSource instanceof ArrayBuffer) {
        audioBuffer = await this.audioContext.decodeAudioData(audioSource);
      } else if (audioSource instanceof Blob) {
        const arrayBuffer = await audioSource.arrayBuffer();
        audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      } else if (typeof audioSource === 'string') {
        // URL or data URL
        audioBuffer = await this.loadAudioFromUrl(audioSource);
      } else {
        throw new Error('Unsupported audio source type');
      }

      // Add to queue or play immediately
      const playbackItem = {
        audioBuffer,
        options: {
          loop: options.loop || false,
          fadeIn: options.fadeIn !== false,
          fadeOut: options.fadeOut !== false,
          volume: options.volume || 1.0,
          startTime: options.startTime || 0,
          duration: options.duration || audioBuffer.duration,
          ...options
        }
      };

      if (this.isPlaying && options.queue !== false) {
        this.playbackQueue.push(playbackItem);
        console.log(`[BrowserAudioPlayer] Added to queue (${this.playbackQueue.length} items)`);
      } else {
        await this.playAudioBuffer(playbackItem);
      }

    } catch (error) {
      console.error('[BrowserAudioPlayer] Playback failed:', error);
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
      throw error;
    }
  }

  /**
   * Load audio from URL
   */
  async loadAudioFromUrl(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load audio: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return await this.audioContext.decodeAudioData(arrayBuffer);

    } catch (error) {
      throw new Error(`Failed to load audio from URL: ${error.message}`);
    }
  }

  /**
   * Play audio buffer with effects
   */
  async playAudioBuffer(playbackItem) {
    const { audioBuffer, options } = playbackItem;

    return new Promise((resolve, reject) => {
      try {
        // Stop current playback if any
        this.stop();

        // Create buffer source
        this.currentSource = this.audioContext.createBufferSource();
        this.currentSource.buffer = audioBuffer;

        // Create audio processing chain
        let audioNode = this.currentSource;

        // Add effects if enabled
        if (this.config.enableEffects && options.effects) {
          audioNode = this.applyEffects(audioNode, options.effects);
        }

        // Create volume control for this playback
        const playbackGain = this.audioContext.createGain();
        playbackGain.gain.value = options.volume * this.config.volume;

        audioNode.connect(playbackGain);
        playbackGain.connect(this.gainNode);

        // Apply fade in
        if (options.fadeIn) {
          playbackGain.gain.setValueAtTime(0, this.audioContext.currentTime);
          playbackGain.gain.linearRampToValueAtTime(
            options.volume * this.config.volume,
            this.audioContext.currentTime + this.config.fadeInDuration
          );
        }

        // Apply fade out
        if (options.fadeOut && !options.loop) {
          const fadeStartTime = this.audioContext.currentTime + options.duration - this.config.fadeOutDuration;
          playbackGain.gain.setValueAtTime(
            options.volume * this.config.volume,
            fadeStartTime
          );
          playbackGain.gain.linearRampToValueAtTime(0, fadeStartTime + this.config.fadeOutDuration);
        }

        // Set up event handlers
        this.currentSource.onended = () => {
          this.isPlaying = false;
          this.currentSource = null;

          this.dispatchEvent(new CustomEvent('playbackComplete', {
            detail: { duration: options.duration }
          }));

          // Process queue
          this.processQueue();

          resolve();
        };

        this.currentSource.onerror = (error) => {
          this.isPlaying = false;
          this.currentSource = null;

          this.dispatchEvent(new CustomEvent('playbackError', { detail: error }));
          reject(error);
        };

        // Start playback
        this.isPlaying = true;
        this.dispatchEvent(new CustomEvent('playbackStarted', {
          detail: {
            duration: options.duration,
            volume: options.volume,
            loop: options.loop
          }
        }));

        if (options.loop) {
          this.currentSource.loop = true;
        }

        this.currentSource.start(
          this.audioContext.currentTime,
          options.startTime,
          options.loop ? undefined : options.duration
        );

        console.log(`[BrowserAudioPlayer] Playing audio: ${options.duration.toFixed(2)}s`);

      } catch (error) {
        this.isPlaying = false;
        this.currentSource = null;
        reject(error);
      }
    });
  }

  /**
   * Apply audio effects
   */
  applyEffects(audioNode, effects) {
    let processedNode = audioNode;

    // Reverb effect
    if (effects.reverb) {
      const convolver = this.audioContext.createConvolver();
      convolver.buffer = this.createReverbImpulse(effects.reverb);
      processedNode.connect(convolver);
      processedNode = convolver;
    }

    // Low-pass filter
    if (effects.lowpass) {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = effects.lowpass.frequency || 1000;
      filter.Q.value = effects.lowpass.Q || 1;
      processedNode.connect(filter);
      processedNode = filter;
    }

    // High-pass filter
    if (effects.highpass) {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = effects.highpass.frequency || 100;
      filter.Q.value = effects.highpass.Q || 1;
      processedNode.connect(filter);
      processedNode = filter;
    }

    // Compressor
    if (effects.compressor) {
      const compressor = this.audioContext.createDynamicsCompressor();
      compressor.threshold.value = effects.compressor.threshold || -24;
      compressor.knee.value = effects.compressor.knee || 30;
      compressor.ratio.value = effects.compressor.ratio || 12;
      compressor.attack.value = effects.compressor.attack || 0.003;
      compressor.release.value = effects.compressor.release || 0.25;
      processedNode.connect(compressor);
      processedNode = compressor;
    }

    return processedNode;
  }

  /**
   * Create reverb impulse response
   */
  createReverbImpulse(reverbConfig) {
    const length = this.audioContext.sampleRate * (reverbConfig.duration || 2);
    const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);

    const decay = reverbConfig.decay || 2;

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }

    return impulse;
  }

  /**
   * Process playback queue
   */
  async processQueue() {
    if (this.isProcessingQueue || this.playbackQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.playbackQueue.length > 0 && !this.isPlaying) {
        const nextItem = this.playbackQueue.shift();
        await this.playAudioBuffer(nextItem);
      }
    } catch (error) {
      console.error('[BrowserAudioPlayer] Queue processing error:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Stop current playback
   */
  stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (error) {
        // Source might already be stopped
      }
      this.currentSource = null;
    }

    this.isPlaying = false;
    this.dispatchEvent(new CustomEvent('playbackStopped'));
  }

  /**
   * Pause current playback (note: Web Audio API doesn't support pause/resume)
   */
  pause() {
    console.warn('[BrowserAudioPlayer] Web Audio API does not support pause/resume. Use stop() instead.');
    this.stop();
  }

  /**
   * Set volume
   */
  setVolume(volume) {
    this.config.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.config.volume;
    }
    this.dispatchEvent(new CustomEvent('volumeChanged', { detail: this.config.volume }));
  }

  /**
   * Get current volume
   */
  getVolume() {
    return this.config.volume;
  }

  /**
   * Clear playback queue
   */
  clearQueue() {
    this.playbackQueue = [];
    this.dispatchEvent(new CustomEvent('queueCleared'));
  }

  /**
   * Get queue length
   */
  getQueueLength() {
    return this.playbackQueue.length;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      isPlaying: this.isPlaying,
      volume: this.config.volume,
      queueLength: this.playbackQueue.length,
      audioContextState: this.audioContext ? this.audioContext.state : null,
      currentTime: this.audioContext ? this.audioContext.currentTime : null
    };
  }

  /**
   * Test audio playback
   */
  async testPlayback() {
    console.log('[BrowserAudioPlayer] Testing audio playback...');

    try {
      // Generate a test tone
      const testBuffer = this.generateTestTone(440, 1.0); // 440Hz for 1 second

      await this.play(testBuffer, { fadeIn: true, fadeOut: true });

      console.log('[BrowserAudioPlayer] Audio test successful');
      this.dispatchEvent(new CustomEvent('testComplete', { detail: { success: true } }));

    } catch (error) {
      console.error('[BrowserAudioPlayer] Audio test failed:', error);
      this.dispatchEvent(new CustomEvent('testFailed', { detail: error }));
      throw error;
    }
  }

  /**
   * Generate test tone
   */
  generateTestTone(frequency, duration) {
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
    }

    return buffer;
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    console.log('[BrowserAudioPlayer] Cleaning up...');

    this.stop();
    this.clearQueue();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.gainNode = null;
    this.isInitialized = false;

    this.dispatchEvent(new CustomEvent('destroyed'));
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrowserAudioPlayer;
} else if (typeof window !== 'undefined') {
  window.BrowserAudioPlayer = BrowserAudioPlayer;
}
