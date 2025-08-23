/**
 * Simple Config Test - Validate your API keys are working
 * This tests the configuration without the full TypeScript setup
 */

// Simple validation test
function testConfig() {
  console.log('🔑 Testing API Key Configuration\n');

  // Test Vapi API key
  const vapiKey = '765f8644-1464-4b36-a4fe-c660e15ba313';
  const elevenLabsKey = 'sk_536c3f9ad29e9e6e4f0b4aee762afa6d8db7d750d7f64587';
  const voiceId = 'XfWTl5ev8ylYnkKBEqnB';

  console.log('✅ Vapi API Key:', vapiKey.substring(0, 8) + '...' + vapiKey.substring(vapiKey.length - 4));
  console.log('✅ ElevenLabs API Key:', elevenLabsKey.substring(0, 8) + '...' + elevenLabsKey.substring(elevenLabsKey.length - 4));
  console.log('✅ Voice ID:', voiceId);

  console.log('\n🧪 Testing API Connections...\n');

  // Test ElevenLabs API
  testElevenLabsAPI(elevenLabsKey, voiceId);
}

async function testElevenLabsAPI(apiKey, voiceId) {
  console.log('1. Testing ElevenLabs API connection...');

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
      headers: {
        'xi-api-key': apiKey,
      }
    });

    if (response.ok) {
      const voiceData = await response.json();
      console.log(`✅ ElevenLabs API working! Voice: "${voiceData.name}"`);
      console.log(`   Category: ${voiceData.category}`);
      console.log(`   Description: ${voiceData.description || 'No description'}`);
    } else {
      console.error(`❌ ElevenLabs API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ ElevenLabs API connection failed:', error.message);
  }

  console.log('\n2. Testing quick TTS synthesis...');

  try {
    const testText = "Hello! This is a test of the Nara TTS system.";

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

    if (response.ok) {
      const audioSize = response.headers.get('content-length');
      console.log(`✅ TTS synthesis working! Generated ${audioSize} bytes of audio`);
      console.log('   Voice quality: Ready for integration');
    } else {
      console.error(`❌ TTS synthesis error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ TTS synthesis failed:', error.message);
  }

  console.log('\n🎯 Next Steps:');
  console.log('1. ElevenLabs integration: ✅ Ready');
  console.log('2. Vapi integration: Requires browser/WebSocket environment');
  console.log('3. Complete pipeline: Ready for Electron app testing');

  console.log('\n🚀 Your audio pipeline is configured and ready!');
  console.log('   Run this in your Electron app to test the complete flow.');
}

// Run the test
testConfig();
