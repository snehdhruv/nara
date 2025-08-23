/**
 * VADProcessor - Voice Activity Detection with low-latency triggering
 * RISK LEVEL 1: Must detect speech reliably within 10-20ms frames
 */

import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import path from 'path';

export interface VADConfig {
  frameSize: number; // milliseconds (10-20ms recommended)
  threshold: number; // voice detection threshold (0-1)
  hysteresis: {
    speechFrames: number; // N frames needed to trigger speech
    totalFrames: number; // out of M recent frames
    silenceMs: number; // ms of silence to re-arm (200-300ms)
  };
  sampleRate: number; // 48kHz recommended for macOS
}

export interface VADMetrics {
  frameProcessingTime: number;
  speechConfidence: number;
  backgroundNoise: number;
}

export class VADProcessor extends EventEmitter {
  private worker: Worker | null = null;
  private isRunning = false;
  private config: VADConfig;
  private metrics: VADMetrics;
  private lastSpeechTime = 0;
  private isInSpeechMode = false;

  constructor(config?: Partial<VADConfig>) {
    super();

    this.config = {
      frameSize: 20, // 20ms frames for good balance
      threshold: 0.6, // Adjust based on testing
      hysteresis: {
        speechFrames: 3, // 3 out of 5 frames
        totalFrames: 5,
        silenceMs: 250 // 250ms silence to re-arm
      },
      sampleRate: 48000, // macOS native
      ...config
    };

    this.metrics = {
      frameProcessingTime: 0,
      speechConfidence: 0,
      backgroundNoise: 0
    };
  }

  async initialize(): Promise<void> {
    console.log('[VADProcessor] Initializing voice activity detection...');

    try {
      // Create worker for VAD processing (prevents UI blocking)
      const workerPath = path.join(__dirname, '../workers/vad.worker.js');
      this.worker = new Worker(workerPath);

      this.setupWorkerHandlers();

      // Initialize worker with config
      this.worker.postMessage({
        type: 'init',
        config: this.config
      });

      // Wait for worker ready signal
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('VAD worker initialization timeout'));
        }, 5000);

        this.worker!.once('message', (message) => {
          if (message.type === 'ready') {
            clearTimeout(timeout);
            resolve(void 0);
          } else if (message.type === 'error') {
            clearTimeout(timeout);
            reject(new Error(message.error));
          }
        });
      });

      console.log('[VADProcessor] VAD initialized successfully');

    } catch (error) {
      console.error('[VADProcessor] Initialization failed:', error);
      throw error;
    }
  }

  private setupWorkerHandlers(): void {
    if (!this.worker) return;

    this.worker.on('message', (message) => {
      switch (message.type) {
        case 'speechDetected':
          this.handleSpeechDetected(message.data);
          break;

        case 'speechEnded':
          this.handleSpeechEnded(message.data);
          break;

        case 'metrics':
          this.updateMetrics(message.data);
          break;

        case 'error':
          console.error('[VADProcessor] Worker error:', message.error);
          this.emit('error', new Error(message.error));
          break;
      }
    });

    this.worker.on('error', (error) => {
      console.error('[VADProcessor] Worker thread error:', error);
      this.emit('error', error);
    });
  }

  private handleSpeechDetected(data: any): void {
    const now = Date.now();

    // Prevent rapid re-triggering during TTS playback
    if (this.isInSpeechMode && (now - this.lastSpeechTime) < this.config.hysteresis.silenceMs) {
      return;
    }

    this.isInSpeechMode = true;
    this.lastSpeechTime = now;

    console.log(`[VADProcessor] Speech detected (confidence: ${data.confidence})`);
    this.emit('speechStart', {
      confidence: data.confidence,
      timestamp: now
    });
  }

  private handleSpeechEnded(data: any): void {
    console.log('[VADProcessor] Speech ended');
    this.emit('speechEnd', {
      duration: data.duration,
      timestamp: Date.now()
    });

    // Reset speech mode after silence period
    setTimeout(() => {
      this.isInSpeechMode = false;
    }, this.config.hysteresis.silenceMs);
  }

  private updateMetrics(data: VADMetrics): void {
    this.metrics = { ...data };
    this.emit('metrics', this.metrics);
  }

  async start(): Promise<void> {
    if (this.isRunning || !this.worker) {
      return;
    }

    console.log('[VADProcessor] Starting voice activity detection...');

    this.worker.postMessage({ type: 'start' });
    this.isRunning = true;

    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning || !this.worker) {
      return;
    }

    console.log('[VADProcessor] Stopping voice activity detection...');

    this.worker.postMessage({ type: 'stop' });
    this.isRunning = false;
    this.isInSpeechMode = false;

    this.emit('stopped');
  }

  getMetrics(): VADMetrics {
    return { ...this.metrics };
  }

  getConfig(): VADConfig {
    return { ...this.config };
  }

  // Update config on the fly (useful for tuning during demo)
  async updateConfig(newConfig: Partial<VADConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    if (this.worker) {
      this.worker.postMessage({
        type: 'updateConfig',
        config: this.config
      });
    }
  }

  // Manual trigger for testing
  triggerSpeech(): void {
    this.handleSpeechDetected({ confidence: 1.0 });
  }

  async destroy(): Promise<void> {
    if (this.worker) {
      await this.stop();
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
