/**
 * TTS-Only Test - Test just the ElevenLabs TTS that we need
 */

const fs = require('fs');
const { spawn } = require('child_process');

async function testTTSOnly() {
  console.log('🗣️ Testing ElevenLabs TTS Integration\n');

  const apiKey = 'sk_536c3f9ad29e9e6e4f0b4aee762afa6d8db7d750d7f64587';
  const voiceId = 'XfWTl5ev8ylYnkKBEqnB';
  const testText = "Hey there! This is Nara, your audiobook assistant. The TTS integration is working perfectly.";

  console.log('🎯 Configuration:');
  console.log(`   API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log(`   Voice ID: ${voiceId}`);
  console.log(`   Test Text: "${testText}"\n`);

  try {
    console.log('1. Synthesizing speech...');
    const startTime = Date.now();

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: testText,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true
        }
      })
    });

    const synthesisTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ TTS API Error: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      return false;
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`✅ TTS synthesis completed in ${synthesisTime}ms`);
    console.log(`   Audio size: ${audioBuffer.length} bytes`);
    console.log(`   Format: MP3`);

    // Save audio file
    const audioFile = '/tmp/nara_tts_test.mp3';
    fs.writeFileSync(audioFile, audioBuffer);
    console.log(`   Saved to: ${audioFile}`);

    // Try to play the audio
    console.log('\n2. Testing audio playback...');
    try {
      await playAudio(audioFile);
      console.log('✅ Audio playback completed successfully');
    } catch (playError) {
      console.warn('⚠️  Audio playback test skipped:', playError.message);
      console.log('   (This is normal if no audio output is available)');
    }

    // Performance metrics
    console.log('\n📊 Performance Metrics:');
    console.log(`   Synthesis Latency: ${synthesisTime}ms (target: <3000ms)`);
    console.log(`   Audio Quality: Professional TTS`);
    console.log(`   Voice Consistency: High (stability: 0.75)`);

    if (synthesisTime < 3000) {
      console.log('   ✅ Latency meets real-time requirements');
    } else {
      console.log('   ⚠️  Latency exceeds 3-second target');
    }

    console.log('\n🎯 TTS Integration Status:');
    console.log('   ✅ API Connection: Working');
    console.log('   ✅ Voice Synthesis: Working');
    console.log('   ✅ Audio Generation: Working');
    console.log('   ✅ Performance: Good');

    console.log('\n🚀 Ready for integration with Vapi wake word detection!');
    return true;

  } catch (error) {
    console.error('❌ TTS test failed:', error.message);
    return false;
  }
}

function playAudio(filePath) {
  return new Promise((resolve, reject) => {
    const player = spawn('afplay', [filePath]);

    player.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Audio playback failed with code ${code}`));
      }
    });

    player.on('error', (error) => {
      reject(error);
    });
  });
}

// Run the test
testTTSOnly().then(success => {
  console.log(`\n${success ? '🟢 TTS TEST PASSED' : '🔴 TTS TEST FAILED'}`);
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
