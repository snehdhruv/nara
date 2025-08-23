/**
 * Test Audio Pipeline - Quick test with your hardcoded keys
 * Run this to test the complete Vapi + ElevenLabs integration
 */

import { AudioManager } from './main/audio';
import { getAudioConfig, validateAudioConfig } from './main/audio/config';

async function testAudioPipeline() {
  console.log('🎯 Testing Complete Audio Pipeline\n');

  try {
    // 1. Validate configuration
    console.log('1. Validating API keys...');
    const validation = validateAudioConfig();

    if (!validation.isValid) {
      console.error('❌ Configuration invalid. Please update main/audio/config.ts:');
      validation.missing.forEach(item => console.error(`   - Add your ${item}`));
      return false;
    }

    console.log('✅ All API keys configured\n');

    // 2. Get configuration
    const { vapi, tts } = getAudioConfig();

    // 3. Initialize AudioManager
    console.log('2. Initializing audio pipeline...');
    const audioManager = new AudioManager(tts, vapi);

    await audioManager.initialize();
    console.log('✅ Audio pipeline initialized\n');

    // 4. Set up event handlers
    audioManager.on('playbackPaused', (data) => {
      console.log(`🎯 Wake word detected! Spotify paused in ${data.latency}ms`);
    });

    audioManager.on('playbackResumed', (data) => {
      console.log(`▶️ Response complete! Spotify resumed in ${data.latency}ms`);
      console.log('👂 Listening for "Hey Nara" again...\n');
    });

    audioManager.on('processingError', (error) => {
      console.error('❌ Pipeline error:', error);
    });

    // 5. Start listening for wake word
    console.log('3. Starting wake word listening...');
    await audioManager.startListening();

    console.log('✅ Now listening for "Hey Nara"!\n');
    console.log('🎤 Try saying:');
    console.log('   - "Hey Nara, who is the main character?"');
    console.log('   - "Hey Nara, what happened in chapter 2?"');
    console.log('   - "Hey Nara, explain this concept"\n');

    // 6. Test manual trigger after 5 seconds
    setTimeout(() => {
      console.log('🧪 Testing manual wake word trigger...');
      audioManager.triggerWakeWord();
    }, 5000);

    // Keep the process running
    console.log('Press Ctrl+C to stop\n');

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testAudioPipeline().then(success => {
    if (!success) {
      process.exit(1);
    }
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { testAudioPipeline };
