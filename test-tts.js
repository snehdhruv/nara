/**
 * Quick TTS Test - Validate ElevenLabs integration
 * Run this to test your API key and voice ID
 */

// Simple Node.js test without TypeScript compilation
const https = require('https');
const fs = require('fs');
const { spawn } = require('child_process');

// REPLACE THESE WITH YOUR ACTUAL CREDENTIALS
const ELEVENLABS_API_KEY = 'your-api-key-here';
const VOICE_ID = 'your-voice-id-here';

async function testTTS() {
  console.log('🗣️ Testing ElevenLabs TTS Integration...\n');

  // Test text
  const testText = "Hello! This is a test of the Nara audiobook assistant. The TTS integration is working correctly.";

  try {
    console.log('1. Testing API connection...');
    
    // Test voice info first
    const voiceInfo = await getVoiceInfo(VOICE_ID, ELEVENLABS_API_KEY);
    console.log(`✅ Voice found: ${voiceInfo.name}`);
    console.log(`   Category: ${voiceInfo.category}`);
    console.log(`   Description: ${voiceInfo.description || 'No description'}\n`);

    console.log('2. Synthesizing test audio...');
    const startTime = Date.now();
    
    const audioBuffer = await synthesizeText(testText, VOICE_ID, ELEVENLABS_API_KEY);
    const synthesisTime = Date.now() - startTime;
    
    console.log(`✅ TTS synthesis completed in ${synthesisTime}ms`);
    console.log(`   Audio size: ${audioBuffer.length} bytes\n`);

    console.log('3. Playing audio...');
    const tempFile = '/tmp/nara_tts_test.mp3';
    fs.writeFileSync(tempFile, audioBuffer);
    
    await playAudio(tempFile);
    console.log('✅ Audio playback completed\n');

    // Cleanup
    fs.unlinkSync(tempFile);

    console.log('🟢 TTS INTEGRATION TEST PASSED!');
    console.log(`   Synthesis latency: ${synthesisTime}ms (target: <3000ms)`);
    console.log('   Voice quality: Listen to the audio above');
    console.log('   Ready for integration into AudioManager\n');

    return true;

  } catch (error) {
    console.error('❌ TTS integration test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check your API key is correct');
    console.log('2. Check your voice ID is correct');
    console.log('3. Ensure you have ElevenLabs credits');
    console.log('4. Check your internet connection\n');
    
    return false;
  }
}

function getVoiceInfo(voiceId, apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: `/v1/voices/${voiceId}`,
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`API error: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

function synthesizeText(text, voiceId, apiKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      text: text,
      model_id: 'eleven_turbo_v2',
      voice_settings: {
        stability: 0.75,
        similarity_boost: 0.8,
        style: 0.2,
        use_speaker_boost: true
      }
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: `/v1/text-to-speech/${voiceId}/stream`,
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errorData = '';
        res.on('data', (chunk) => errorData += chunk);
        res.on('end', () => reject(new Error(`TTS API error: ${res.statusCode} ${errorData}`)));
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      res.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
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
if (require.main === module) {
  // Check if credentials are set
  if (ELEVENLABS_API_KEY === 'your-api-key-here' || VOICE_ID === 'your-voice-id-here') {
    console.log('❌ Please update the credentials in this file:');
    console.log('   ELEVENLABS_API_KEY = "your-actual-api-key"');
    console.log('   VOICE_ID = "your-actual-voice-id"');
    process.exit(1);
  }

  testTTS().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testTTS };
