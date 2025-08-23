/**
 * Audio Module Entry Point - Export all audio components
 * YOUR DOMAIN: Complete TTS and audio pipeline
 */

export { AudioManager, AudioPipelineState, AudioDevice } from './AudioManager';
export { VoiceAgentBridge, VoiceContext, QAResult } from './VoiceAgentBridge';
export { AudioOrchestrator, AudioInteractionState, AudioInteraction } from './AudioOrchestrator';
export { ChapterIndexResolver, ChapterResolution } from './ChapterIndexResolver';
export { TTSService, TTSConfig, TTSRequest, TTSResponse } from './TTSService';
export { VapiService, VapiConfig, VapiTranscription, VapiWakeWordDetection } from './VapiService';

// Legacy exports (may exist or not - keeping for compatibility)
export type { PlaybackState } from './PlaybackController';
export type { VADConfig, VADMetrics } from './VADProcessor';
export type { WakeWordConfig, WakeWordDetection } from './WakeWordService';
export type { DeviceConfiguration } from './DeviceRouter';
export type { AudioPlayerConfig, PlaybackMetrics } from './AudioPlayer';

// Configuration
export { AUDIO_CONFIG, getAudioConfig, validateAudioConfig } from './config';

// Integration utilities
export { 
  createVoiceAgentBridge,
  initializeCompletePipeline,
  demonstrateVoicePipeline,
  testRealDataIntegration
} from './INTEGRATION_EXAMPLE';

// Re-export for convenience
export * from './AudioManager';
