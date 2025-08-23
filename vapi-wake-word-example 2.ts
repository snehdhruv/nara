/**
 * Example: Using Vapi for both Wake Word Detection AND STT
 * This shows how to configure and use the unified Vapi service
 */

import { AudioManager, VapiConfig, TTSConfig } from './main/audio';

async function setupVapiWakeWordPipeline() {
  console.log('🎯 Setting up Vapi Wake Word + STT Pipeline\n');

  // Configure Vapi for both wake word detection and STT
  const vapiConfig: VapiConfig = {
    apiKey: 'your-vapi-api-key',
    transcriptionModel: 'nova-2', // Fast and accurate
    language: 'en-US',

    // Enable wake word detection
    wakeWord: {
      enabled: true,
      phrase: 'Hey Nara',      // What to listen for
      sensitivity: 0.7         // 70% confidence threshold
    }
  };

  // Configure TTS (ElevenLabs)
  const ttsConfig: TTSConfig = {
    apiKey: 'your-elevenlabs-api-key',
    voiceId: 'your-narrator-voice-id',
    model: 'eleven_turbo_v2',
    stability: 0.75,
    similarityBoost: 0.8,
    style: 0.2,
    useSpeakerBoost: true
  };

  // Create AudioManager with Vapi handling both wake word and STT
  const audioManager = new AudioManager(ttsConfig, vapiConfig);

  // Initialize the complete pipeline
  await audioManager.initialize();

  console.log('✅ Audio pipeline initialized with Vapi wake word detection');

  // Start listening for "Hey Nara"
  await audioManager.startListening();

  console.log('👂 Now listening for "Hey Nara"...');
  console.log('   Say: "Hey Nara, who is the main character?"');
  console.log('   Say: "Hey Nara, what happened in chapter 2?"');

  return audioManager;
}

// Example usage with event handlers
async function demonstrateVapiPipeline() {
  const audioManager = await setupVapiWakeWordPipeline();

  // Listen for wake word detection
  audioManager.on('playbackPaused', (data) => {
    console.log(`🎯 Wake word detected! Spotify paused in ${data.latency}ms`);
  });

  // Listen for TTS completion
  audioManager.on('playbackResumed', (data) => {
    console.log(`▶️ Response complete! Spotify resumed in ${data.latency}ms`);
    console.log('👂 Listening for "Hey Nara" again...');
  });

  // Handle errors
  audioManager.on('processingError', (error) => {
    console.error('❌ Pipeline error:', error);
  });

  // Manual trigger for testing
  setTimeout(() => {
    console.log('\n🧪 Testing manual wake word trigger...');
    audioManager.triggerWakeWord();
  }, 5000);
}

// Run the example
if (require.main === module) {
  demonstrateVapiPipeline().catch(console.error);
}

export { setupVapiWakeWordPipeline, demonstrateVapiPipeline };
