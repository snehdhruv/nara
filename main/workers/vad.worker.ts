/**
 * VAD Worker - Voice Activity Detection processing in separate thread
 * RISK LEVEL 1: Must process 10-20ms audio frames without blocking main thread
 */

import { parentPort } from 'worker_threads';

interface VADConfig {
  frameSize: number;
  threshold: number;
  hysteresis: {
    speechFrames: number;
    totalFrames: number;
    silenceMs: number;
  };
  sampleRate: number;
}

class VADWorker {
  private config: VADConfig | null = null;
  private isRunning = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;

  // VAD state
  private recentFrames: boolean[] = [];
  private lastSpeechTime = 0;
  private isInSpeech = false;
  private backgroundNoise = 0;
  private noiseCalibrationFrames = 0;
  private readonly NOISE_CALIBRATION_COUNT = 50; // ~1 second at 20ms frames

  constructor() {
    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    if (!parentPort) return;

    parentPort.on('message', (message) => {
      switch (message.type) {
        case 'init':
          this.initialize(message.config);
          break;
        case 'start':
          this.start();
          break;
        case 'stop':
          this.stop();
          break;
        case 'updateConfig':
          this.updateConfig(message.config);
          break;
      }
    });
  }

  private async initialize(config: VADConfig): Promise<void> {
    try {
      this.config = config;

      // Initialize Web Audio API
      // Note: In a real implementation, you'd need to handle the fact that
      // Worker threads don't have access to Web Audio API directly.
      // You'd need to use a different approach, like:
      // 1. Native audio processing with node-portaudio
      // 2. Streaming audio data from main thread
      // 3. Using a different VAD library

      // For now, this is a conceptual implementation
      this.sendMessage({ type: 'ready' });

    } catch (error) {
      this.sendMessage({
        type: 'error',
        error: `VAD initialization failed: ${error}`
      });
    }
  }

  private async start(): Promise<void> {
    if (this.isRunning || !this.config) return;

    try {
      this.isRunning = true;
      this.recentFrames = [];
      this.backgroundNoise = 0;
      this.noiseCalibrationFrames = 0;

      // Start audio processing loop
      this.startAudioProcessing();

    } catch (error) {
      this.sendMessage({
        type: 'error',
        error: `VAD start failed: ${error}`
      });
    }
  }

  private stop(): void {
    this.isRunning = false;

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  private updateConfig(newConfig: VADConfig): void {
    this.config = newConfig;
  }

  private startAudioProcessing(): void {
    if (!this.config) return;

    // Simulate audio processing with timer
    // In real implementation, this would be driven by actual audio frames
    const frameIntervalMs = this.config.frameSize;

    const processFrame = () => {
      if (!this.isRunning) return;

      const startTime = performance.now();

      // Simulate getting audio frame data
      const audioLevel = this.simulateAudioLevel();

      // Process the frame
      this.processAudioFrame(audioLevel);

      const processingTime = performance.now() - startTime;

      // Send metrics
      this.sendMessage({
        type: 'metrics',
        data: {
          frameProcessingTime: processingTime,
          speechConfidence: audioLevel,
          backgroundNoise: this.backgroundNoise
        }
      });

      // Schedule next frame
      setTimeout(processFrame, frameIntervalMs);
    };

    processFrame();
  }

  private simulateAudioLevel(): number {
    // In real implementation, this would analyze actual audio data
    // For now, simulate varying audio levels
    const baseNoise = 0.1;
    const randomVariation = Math.random() * 0.3;

    // Occasionally simulate speech
    const speechProbability = 0.02; // 2% chance per frame
    if (Math.random() < speechProbability) {
      return baseNoise + 0.6 + (Math.random() * 0.3); // Speech level
    }

    return baseNoise + randomVariation; // Background noise
  }

  private processAudioFrame(audioLevel: number): void {
    if (!this.config) return;

    const now = Date.now();

    // Calibrate background noise for first N frames
    if (this.noiseCalibrationFrames < this.NOISE_CALIBRATION_COUNT) {
      this.backgroundNoise = (this.backgroundNoise * this.noiseCalibrationFrames + audioLevel) /
                            (this.noiseCalibrationFrames + 1);
      this.noiseCalibrationFrames++;
      return;
    }

    // Adjust threshold based on background noise
    const adaptiveThreshold = Math.max(
      this.config.threshold,
      this.backgroundNoise * 2.5 // Threshold should be 2.5x background noise
    );

    // Determine if this frame contains speech
    const isSpeechFrame = audioLevel > adaptiveThreshold;

    // Update recent frames buffer
    this.recentFrames.push(isSpeechFrame);
    if (this.recentFrames.length > this.config.hysteresis.totalFrames) {
      this.recentFrames.shift();
    }

    // Check if we have enough frames for decision
    if (this.recentFrames.length < this.config.hysteresis.totalFrames) {
      return;
    }

    // Count speech frames in recent window
    const speechFrameCount = this.recentFrames.filter(Boolean).length;
    const shouldTriggerSpeech = speechFrameCount >= this.config.hysteresis.speechFrames;

    // Speech start detection
    if (shouldTriggerSpeech && !this.isInSpeech) {
      // Check hysteresis - don't re-trigger too quickly
      const timeSinceLastSpeech = now - this.lastSpeechTime;
      if (timeSinceLastSpeech > this.config.hysteresis.silenceMs) {
        this.isInSpeech = true;
        this.lastSpeechTime = now;

        this.sendMessage({
          type: 'speechDetected',
          data: {
            confidence: audioLevel,
            timestamp: now,
            backgroundNoise: this.backgroundNoise
          }
        });
      }
    }

    // Speech end detection
    else if (!shouldTriggerSpeech && this.isInSpeech) {
      // Require sustained silence to end speech
      const allRecentFramesSilent = this.recentFrames.every(frame => !frame);
      if (allRecentFramesSilent) {
        this.isInSpeech = false;

        this.sendMessage({
          type: 'speechEnded',
          data: {
            duration: now - this.lastSpeechTime,
            timestamp: now
          }
        });
      }
    }

    // Update background noise estimate (slowly)
    if (!isSpeechFrame) {
      this.backgroundNoise = this.backgroundNoise * 0.99 + audioLevel * 0.01;
    }
  }

  private sendMessage(message: any): void {
    if (parentPort) {
      parentPort.postMessage(message);
    }
  }
}

// Initialize the worker
new VADWorker();
