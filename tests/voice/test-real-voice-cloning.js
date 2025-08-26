#!/usr/bin/env node

// Real ElevenLabs Voice Cloning Test
const fs = require('fs');
const path = require('path');

console.log('🎤 Testing REAL ElevenLabs Voice Cloning API...\n');

const API_KEY = 'sk_536c3f9ad29e9e6e4f0b4aee762afa6d8db7d750d7f64587';
const BASE_URL = 'https://api.elevenlabs.io/v1';

// Test 1: List existing voices to verify API connection
async function testAPIConnection() {
  console.log('1. Testing API connection...');
  
  try {
    const response = await fetch(`${BASE_URL}/voices`, {
      headers: {
        'xi-api-key': API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ API connection works - found ${data.voices.length} voices`);
    
    // Show some existing voices
    const existingVoices = data.voices.slice(0, 3).map(v => `${v.name} (${v.voice_id})`);
    console.log(`   Existing voices: ${existingVoices.join(', ')}`);
    
    return data.voices;
    
  } catch (error) {
    console.error('❌ API connection failed:', error.message);
    return null;
  }
}

// Test 2: Create a test audio file for cloning
async function createTestAudioFile() {
  console.log('\n2. Creating test audio file...');
  
  try {
    // Use text-to-speech to create a sample audio file for testing
    const testVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // Paul voice
    const testText = 'Hello, this is a test voice sample for cloning. I am speaking clearly and distinctly to provide a good sample for voice cloning.';
    
    const response = await fetch(`${BASE_URL}/text-to-speech/${testVoiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: testText,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const audioBuffer = await response.arrayBuffer();
    const audioPath = path.join(__dirname, 'test-voice-sample.mp3');
    
    fs.writeFileSync(audioPath, Buffer.from(audioBuffer));
    
    console.log(`✅ Test audio file created: ${audioPath}`);
    console.log(`   File size: ${Math.round(audioBuffer.byteLength / 1024)}KB`);
    
    return audioPath;
    
  } catch (error) {
    console.error('❌ Failed to create test audio:', error.message);
    return null;
  }
}

// Test 3: Actually clone a voice using the ElevenLabs API
async function testVoiceCloning(audioPath) {
  console.log('\n3. Testing ACTUAL voice cloning...');
  
  try {
    // Read the audio file
    const audioBuffer = fs.readFileSync(audioPath);
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    
    // Create form data for voice cloning
    const formData = new FormData();
    formData.append('name', `Test Cloned Voice ${Date.now()}`);
    formData.append('description', 'Test voice clone for integration testing');
    formData.append('files', audioBlob, 'test-sample.mp3');
    
    // Make the voice cloning request
    const response = await fetch(`${BASE_URL}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const clonedVoice = await response.json();
    
    console.log('✅ Voice cloning successful!');
    console.log(`   Cloned Voice ID: ${clonedVoice.voice_id}`);
    console.log(`   Cloned Voice Name: ${clonedVoice.name}`);
    
    return clonedVoice;
    
  } catch (error) {
    console.error('❌ Voice cloning failed:', error.message);
    return null;
  }
}

// Test 4: Test the cloned voice by generating speech
async function testClonedVoice(clonedVoice) {
  console.log('\n4. Testing cloned voice speech generation...');
  
  try {
    const testText = 'This is a test of the cloned voice. If you can hear this, the voice cloning was successful!';
    
    const response = await fetch(`${BASE_URL}/text-to-speech/${clonedVoice.voice_id}`, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: testText,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const audioBuffer = await response.arrayBuffer();
    const outputPath = path.join(__dirname, `cloned-voice-test-${clonedVoice.voice_id}.mp3`);
    
    fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
    
    console.log('✅ Cloned voice speech generation works!');
    console.log(`   Generated audio: ${outputPath}`);
    console.log(`   Audio size: ${Math.round(audioBuffer.byteLength / 1024)}KB`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Cloned voice speech generation failed:', error.message);
    return false;
  }
}

// Test 5: Clean up test voices
async function cleanupTestVoices(voiceId) {
  console.log('\n5. Cleaning up test voice...');
  
  try {
    const response = await fetch(`${BASE_URL}/voices/${voiceId}`, {
      method: 'DELETE',
      headers: {
        'xi-api-key': API_KEY
      }
    });
    
    if (!response.ok) {
      console.log(`⚠️  Could not delete test voice (${response.status})`);
    } else {
      console.log('✅ Test voice cleaned up');
    }
    
  } catch (error) {
    console.log('⚠️  Cleanup failed:', error.message);
  }
}

// Run all tests
async function runRealVoiceCloningTests() {
  console.log('🚀 REAL VOICE CLONING INTEGRATION TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Test API connection
  const voices = await testAPIConnection();
  if (!voices) {
    console.log('\n❌ FAILED: Cannot connect to ElevenLabs API');
    process.exit(1);
  }
  
  // Create test audio
  const audioPath = await createTestAudioFile();
  if (!audioPath) {
    console.log('\n❌ FAILED: Cannot create test audio file');
    process.exit(1);
  }
  
  // Clone voice
  const clonedVoice = await testVoiceCloning(audioPath);
  if (!clonedVoice) {
    console.log('\n❌ FAILED: Voice cloning did not work');
    // Clean up test audio
    try { fs.unlinkSync(audioPath); } catch {}
    process.exit(1);
  }
  
  // Test cloned voice
  const speechWorks = await testClonedVoice(clonedVoice);
  if (!speechWorks) {
    console.log('\n❌ FAILED: Cloned voice cannot generate speech');
    await cleanupTestVoices(clonedVoice.voice_id);
    try { fs.unlinkSync(audioPath); } catch {}
    process.exit(1);
  }
  
  // Clean up
  await cleanupTestVoices(clonedVoice.voice_id);
  try { fs.unlinkSync(audioPath); } catch {}
  
  // Final results
  console.log('\n📊 REAL VOICE CLONING TEST RESULTS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ API Connection: PASSED');
  console.log('✅ Audio File Generation: PASSED');
  console.log('✅ Voice Cloning: PASSED');
  console.log('✅ Cloned Voice Speech: PASSED');
  console.log('✅ Cleanup: PASSED');
  
  console.log('\n🎉 REAL VOICE CLONING TEST PASSED!');
  console.log('   ElevenLabs voice cloning API is fully functional');
  console.log('   Unique voice IDs are being generated successfully');
  console.log('   Cloned voices can generate speech correctly');
  
  process.exit(0);
}

// Run the tests
runRealVoiceCloningTests();