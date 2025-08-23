/**
 * Audio Configuration - Hardcoded keys for development
 * TODO: Auth team will replace with secure credential management
 */

import { VapiConfig, TTSConfig } from './index';

// 🔑 ADD YOUR API KEYS HERE
export const AUDIO_CONFIG = {
  // Vapi Configuration (Wake Word + STT)
  vapi: {
    apiKey: process.env.VAPI_API_KEY || '',           // Use environment variable
    assistantId: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || '',      // Use environment variable
    transcriptionModel: 'nova-2' as const,      // Fast and accurate
    language: 'en-US',
    wakeWord: {
      enabled: true,
      phrase: 'Hey Nara',                       // Wake phrase
      sensitivity: 0.7                          // 70% confidence threshold
    },
    // Enhanced audio quality settings
    audioQuality: {
      sampleRate: 16000,                        // 16kHz PCM sample rate
      bitrate: 128,                            // Good quality bitrate
      echoCancellation: true,                  // Cancel echo
      noiseSuppression: true,                  // Suppress background noise
      autoGainControl: true,                   // Automatic volume control
      channelCount: 1                          // Mono for voice
    },
    // Voice enhancement options
    voiceEnhancement: {
      enabled: true,                           // Enable voice processing
      backgroundNoiseReduction: 0.8,          // Strong noise reduction
      speechEnhancement: true,                 // Enhance speech clarity
      adaptiveFiltering: true                  // Adaptive noise filtering
    }
  } as VapiConfig,

  // ElevenLabs Configuration (TTS)
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',     // Use environment variable
    voiceId: process.env.NEXT_PUBLIC_TTS_VOICE_ID || 'XfWTl5ev8ylYnkKBEqnB',     // Use environment variable
    model: 'eleven_turbo_v2' as const,          // Fastest for real-time
    stability: 0.75,                            // Voice consistency
    similarityBoost: 0.8,                      // Voice similarity to original
    style: 0.2,                                // Minimal style variation
    useSpeakerBoost: true                      // Enhance voice clarity
  } as TTSConfig
};

// Validation function to check if keys are set
export function validateAudioConfig(): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (AUDIO_CONFIG.vapi.apiKey === 'your-vapi-api-key-here') {
    missing.push('Vapi API key');
  }

  if (AUDIO_CONFIG.vapi.assistantId === 'PASTE_YOUR_ASSISTANT_ID_HERE') {
    missing.push('Vapi Assistant ID');
  }

  if (AUDIO_CONFIG.elevenlabs.apiKey === 'your-elevenlabs-api-key-here') {
    missing.push('ElevenLabs API key');
  }

  if (AUDIO_CONFIG.elevenlabs.voiceId === 'your-narrator-voice-id-here') {
    missing.push('ElevenLabs voice ID');
  }

  return {
    isValid: missing.length === 0,
    missing
  };
}

// Helper to get config with validation
export function getAudioConfig(): { vapi: VapiConfig; tts: TTSConfig } {
  const validation = validateAudioConfig();

  if (!validation.isValid) {
    console.error('❌ Missing audio configuration:');
    validation.missing.forEach(item => console.error(`   - ${item}`));
    console.error('\n📝 Please update main/audio/config.ts with your API keys');
    throw new Error(`Missing audio configuration: ${validation.missing.join(', ')}`);
  }

  console.log('✅ Audio configuration validated');
  return {
    vapi: AUDIO_CONFIG.vapi,
    tts: AUDIO_CONFIG.elevenlabs
  };
}
