/**
 * Browser Audio Modules - All-in-one import for Nara audio components
 * Modular audio pipeline for web applications
 */

// Configuration constants
const NARA_AUDIO_CONFIG = {
  // Default Vapi configuration
  vapi: {
    audioQuality: {
      sampleRate: 16000,
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
    }
  },

  // Default TTS configuration
  tts: {
    model: 'eleven_turbo_v2',
    stability: 0.75,
    similarityBoost: 0.8,
    style: 0.2,
    useSpeakerBoost: true,
    outputFormat: 'mp3_44100_128',
    optimizeStreamingLatency: 3
  },

  // Default Audio Player configuration
  audioPlayer: {
    volume: 1.0,
    fadeInDuration: 0.1,
    fadeOutDuration: 0.1,
    bufferSize: 4096,
    enableEffects: false
  }
};

/**
 * Nara Audio Factory - Easy creation of audio services
 */
class NaraAudioFactory {
  /**
   * Create a complete audio pipeline
   */
  static async createAudioPipeline(config = {}) {
    const mergedConfig = {
      ...NARA_AUDIO_CONFIG,
      ...config,
      vapi: { ...NARA_AUDIO_CONFIG.vapi, ...config.vapi },
      tts: { ...NARA_AUDIO_CONFIG.tts, ...config.tts },
      audioPlayer: { ...NARA_AUDIO_CONFIG.audioPlayer, ...config.audioPlayer }
    };

    // Validate required configuration
    if (!config.vapiApiKey || !config.vapiAssistantId) {
      throw new Error('Vapi API key and Assistant ID are required');
    }

    // Create and initialize audio manager
    const audioManager = new BrowserAudioManager(mergedConfig);
    await audioManager.initialize();

    return audioManager;
  }

  /**
   * Create individual Vapi service
   */
  static async createVapiService(config) {
    if (!config.apiKey || !config.assistantId) {
      throw new Error('Vapi API key and Assistant ID are required');
    }

    const vapiConfig = {
      ...NARA_AUDIO_CONFIG.vapi,
      ...config
    };

    const vapiService = new BrowserVapiService(vapiConfig);
    await vapiService.initialize();

    return vapiService;
  }

  /**
   * Create individual TTS service
   */
  static async createTTSService(config) {
    if (!config.apiKey || !config.voiceId) {
      throw new Error('ElevenLabs API key and Voice ID are required');
    }

    const ttsConfig = {
      ...NARA_AUDIO_CONFIG.tts,
      ...config
    };

    const ttsService = new BrowserTTSService(ttsConfig);
    await ttsService.initialize();

    return ttsService;
  }

  /**
   * Create individual Audio Player
   */
  static async createAudioPlayer(config = {}) {
    const playerConfig = {
      ...NARA_AUDIO_CONFIG.audioPlayer,
      ...config
    };

    const audioPlayer = new BrowserAudioPlayer(playerConfig);
    await audioPlayer.initialize();

    return audioPlayer;
  }

  /**
   * Test audio capabilities
   */
  static async testAudioCapabilities() {
    const results = {
      microphone: false,
      webAudio: false,
      mediaRecorder: false,
      webSocket: false,
      fetch: false,
      overall: false
    };

    try {
      // Test microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      results.microphone = true;
    } catch (error) {
      console.warn('Microphone test failed:', error);
    }

    try {
      // Test Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await audioContext.close();
      results.webAudio = true;
    } catch (error) {
      console.warn('Web Audio API test failed:', error);
    }

    try {
      // Test MediaRecorder
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.stop();
      stream.getTracks().forEach(track => track.stop());
      results.mediaRecorder = true;
    } catch (error) {
      console.warn('MediaRecorder test failed:', error);
    }

    try {
      // Test WebSocket
      const ws = new WebSocket('wss://echo.websocket.org');
      ws.close();
      results.webSocket = true;
    } catch (error) {
      console.warn('WebSocket test failed:', error);
    }

    try {
      // Test Fetch API
      await fetch('data:text/plain,test');
      results.fetch = true;
    } catch (error) {
      console.warn('Fetch API test failed:', error);
    }

    results.overall = results.microphone && results.webAudio &&
                     results.mediaRecorder && results.webSocket && results.fetch;

    return results;
  }
}

/**
 * Utility functions for audio processing
 */
class NaraAudioUtils {
  /**
   * Convert audio sample rate
   */
  static resampleAudio(audioBuffer, targetSampleRate) {
    if (audioBuffer.sampleRate === targetSampleRate) {
      return audioBuffer;
    }

    const ratio = audioBuffer.sampleRate / targetSampleRate;
    const newLength = Math.round(audioBuffer.length / ratio);
    const audioContext = new AudioContext({ sampleRate: targetSampleRate });
    const newBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      newLength,
      targetSampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const oldData = audioBuffer.getChannelData(channel);
      const newData = newBuffer.getChannelData(channel);

      for (let i = 0; i < newLength; i++) {
        const oldIndex = i * ratio;
        const index = Math.floor(oldIndex);
        const fraction = oldIndex - index;

        if (index + 1 < oldData.length) {
          newData[i] = oldData[index] * (1 - fraction) + oldData[index + 1] * fraction;
        } else {
          newData[i] = oldData[index];
        }
      }
    }

    return newBuffer;
  }

  /**
   * Apply fade in/out to audio buffer
   */
  static applyFade(audioBuffer, fadeInDuration = 0.1, fadeOutDuration = 0.1) {
    const sampleRate = audioBuffer.sampleRate;
    const fadeInSamples = Math.floor(fadeInDuration * sampleRate);
    const fadeOutSamples = Math.floor(fadeOutDuration * sampleRate);

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);

      // Apply fade in
      for (let i = 0; i < fadeInSamples && i < channelData.length; i++) {
        channelData[i] *= i / fadeInSamples;
      }

      // Apply fade out
      const startFadeOut = channelData.length - fadeOutSamples;
      for (let i = startFadeOut; i < channelData.length; i++) {
        if (i >= 0) {
          channelData[i] *= (channelData.length - i) / fadeOutSamples;
        }
      }
    }

    return audioBuffer;
  }

  /**
   * Normalize audio buffer volume
   */
  static normalizeAudio(audioBuffer, targetLevel = 0.8) {
    let maxAmplitude = 0;

    // Find maximum amplitude across all channels
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[i]));
      }
    }

    if (maxAmplitude === 0) return audioBuffer;

    const scaleFactor = targetLevel / maxAmplitude;

    // Apply normalization
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] *= scaleFactor;
      }
    }

    return audioBuffer;
  }

  /**
   * Calculate audio RMS level
   */
  static calculateRMS(audioBuffer) {
    let sum = 0;
    let sampleCount = 0;

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i];
        sampleCount++;
      }
    }

    return Math.sqrt(sum / sampleCount);
  }

  /**
   * Convert Float32Array to Int16Array PCM
   */
  static floatToPCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      int16Array[i] = Math.max(-32768, Math.min(32767, float32Array[i] * 32768));
    }
    return int16Array;
  }

  /**
   * Convert Int16Array PCM to Float32Array
   */
  static pcmToFloat(int16Array) {
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    return float32Array;
  }
}

/**
 * Event logger for debugging
 */
class NaraAudioLogger {
  constructor(enableConsole = true, enableStorage = false) {
    this.enableConsole = enableConsole;
    this.enableStorage = enableStorage;
    this.logs = [];
    this.maxLogs = 1000;
  }

  log(message, level = 'info', component = 'Audio') {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      component,
      message
    };

    if (this.enableConsole) {
      const consoleMethod = level === 'error' ? 'error' :
                           level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[${timestamp}] [${component}] ${message}`);
    }

    if (this.enableStorage) {
      this.logs.push(logEntry);
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
    }
  }

  getLogs(level = null, component = null) {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (component) {
      filteredLogs = filteredLogs.filter(log => log.component === component);
    }

    return filteredLogs;
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Global instances
const naraLogger = new NaraAudioLogger();

// Export everything for browser use
if (typeof window !== 'undefined') {
  window.NaraAudioFactory = NaraAudioFactory;
  window.NaraAudioUtils = NaraAudioUtils;
  window.NaraAudioLogger = NaraAudioLogger;
  window.NARA_AUDIO_CONFIG = NARA_AUDIO_CONFIG;
  window.naraLogger = naraLogger;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NaraAudioFactory,
    NaraAudioUtils,
    NaraAudioLogger,
    NARA_AUDIO_CONFIG,
    naraLogger
  };
}
