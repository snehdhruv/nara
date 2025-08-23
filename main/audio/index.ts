/**
 * Audio Module Entry Point - Export all audio components
 * YOUR DOMAIN: Complete TTS and audio pipeline
 */

export { AudioManager, AudioPipelineState } from './AudioManager';
export { PlaybackController, PlaybackState } from './PlaybackController';
export { VADProcessor, VADConfig, VADMetrics } from './VADProcessor';
export { WakeWordService, WakeWordConfig, WakeWordDetection } from './WakeWordService';
export { DeviceRouter, AudioDevice, DeviceConfiguration } from './DeviceRouter';
export { TTSService, TTSConfig, TTSRequest, TTSResponse } from './TTSService';
export { AudioPlayer, AudioPlayerConfig, PlaybackMetrics } from './AudioPlayer';
export { VapiService, VapiConfig, VapiTranscription, VapiWakeWordDetection } from './VapiService';

// Configuration
export { AUDIO_CONFIG, getAudioConfig, validateAudioConfig } from './config';

// Test utilities
export { TTSTest, testTTS, quickTTSTest } from './TTSTest';
export { AudioTest, runAudioRiskValidation, quickDemoCheck } from './AudioTest';

// Re-export for convenience
export * from './AudioManager';
