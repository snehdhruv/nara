#!/usr/bin/env node

// Test Multiple Voice Cloning - Verify Unique Voice IDs
console.log('🎤 Testing Multiple Voice Cloning for Unique IDs...\n');

const API_KEY = 'sk_536c3f9ad29e9e6e4f0b4aee762afa6d8db7d750d7f64587';
const BASE_URL = 'https://api.elevenlabs.io/v1';

// Create different voice samples using different base voices
async function createUniqueVoiceSamples() {
  console.log('1. Creating unique voice samples...');
  
  const testVoices = [
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Paul', text: 'Hello, this is Paul speaking. I am an experienced narrator with a deep, resonant voice.' },
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', text: 'Hi there, I am Rachel. I speak with clarity and warmth, perfect for audiobook narration.' },
    { id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde', text: 'Good day, this is Clyde. I have a distinctive middle-aged voice with character and depth.' }
  ];
  
  const audioFiles = [];
  
  for (const voice of testVoices) {
    try {
      console.log(`   Creating sample for ${voice.name}...`);
      
      const response = await fetch(`${BASE_URL}/text-to-speech/${voice.id}`, {
        method: 'POST',
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: voice.text,
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
      audioFiles.push({
        name: voice.name,
        buffer: audioBuffer,
        size: audioBuffer.byteLength
      });
      
      console.log(`   ✅ ${voice.name} sample created (${Math.round(audioBuffer.byteLength / 1024)}KB)`);
      
    } catch (error) {
      console.error(`   ❌ Failed to create ${voice.name} sample:`, error.message);
    }
  }
  
  return audioFiles;
}

// Clone multiple voices and verify unique IDs
async function cloneMultipleVoices(audioFiles) {
  console.log('\n2. Cloning multiple voices...');
  
  const clonedVoices = [];
  
  for (const audioFile of audioFiles) {
    try {
      console.log(`   Cloning ${audioFile.name} voice...`);
      
      const audioBlob = new Blob([audioFile.buffer], { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('name', `Cloned ${audioFile.name} ${Date.now()}`);
      formData.append('description', `Test clone of ${audioFile.name} narrator voice`);
      formData.append('files', audioBlob, `${audioFile.name.toLowerCase()}-sample.mp3`);
      
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
      clonedVoices.push({
        originalName: audioFile.name,
        voiceId: clonedVoice.voice_id,
        name: clonedVoice.name
      });
      
      console.log(`   ✅ ${audioFile.name} cloned: ${clonedVoice.voice_id}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`   ❌ Failed to clone ${audioFile.name}:`, error.message);
    }
  }
  
  return clonedVoices;
}

// Test each cloned voice
async function testClonedVoices(clonedVoices) {
  console.log('\n3. Testing cloned voices...');
  
  const testResults = [];
  
  for (const voice of clonedVoices) {
    try {
      console.log(`   Testing ${voice.originalName} (${voice.voiceId})...`);
      
      const testText = `This is a test of the cloned ${voice.originalName} voice. Each cloned voice should sound unique.`;
      
      const response = await fetch(`${BASE_URL}/text-to-speech/${voice.voiceId}`, {
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
      testResults.push({
        ...voice,
        speechWorks: true,
        audioSize: audioBuffer.byteLength
      });
      
      console.log(`   ✅ ${voice.originalName} speech works (${Math.round(audioBuffer.byteLength / 1024)}KB)`);
      
    } catch (error) {
      console.error(`   ❌ ${voice.originalName} speech failed:`, error.message);
      testResults.push({
        ...voice,
        speechWorks: false,
        error: error.message
      });
    }
  }
  
  return testResults;
}

// Clean up all test voices
async function cleanupAllVoices(voices) {
  console.log('\n4. Cleaning up test voices...');
  
  for (const voice of voices) {
    try {
      const response = await fetch(`${BASE_URL}/voices/${voice.voiceId}`, {
        method: 'DELETE',
        headers: {
          'xi-api-key': API_KEY
        }
      });
      
      if (response.ok) {
        console.log(`   ✅ Deleted ${voice.originalName} (${voice.voiceId})`);
      } else {
        console.log(`   ⚠️  Could not delete ${voice.originalName} (${response.status})`);
      }
      
    } catch (error) {
      console.log(`   ⚠️  Delete failed for ${voice.originalName}:`, error.message);
    }
  }
}

// Main test function
async function runMultipleVoiceCloningTest() {
  console.log('🚀 MULTIPLE VOICE CLONING UNIQUENESS TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Create unique voice samples
  const audioFiles = await createUniqueVoiceSamples();
  if (audioFiles.length === 0) {
    console.log('\n❌ FAILED: Could not create any voice samples');
    process.exit(1);
  }
  
  // Clone the voices
  const clonedVoices = await cloneMultipleVoices(audioFiles);
  if (clonedVoices.length === 0) {
    console.log('\n❌ FAILED: Could not clone any voices');
    process.exit(1);
  }
  
  // Test the cloned voices
  const testResults = await testClonedVoices(clonedVoices);
  
  // Analyze results
  console.log('\n📊 MULTIPLE VOICE CLONING RESULTS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const uniqueVoiceIds = new Set(testResults.map(r => r.voiceId));
  const workingVoices = testResults.filter(r => r.speechWorks);
  
  console.log(`✅ Voice samples created: ${audioFiles.length}`);
  console.log(`✅ Voices successfully cloned: ${clonedVoices.length}`);
  console.log(`✅ Unique voice IDs generated: ${uniqueVoiceIds.size}`);
  console.log(`✅ Working cloned voices: ${workingVoices.length}`);
  
  console.log('\nCloned Voice Details:');
  testResults.forEach(result => {
    const status = result.speechWorks ? '✅' : '❌';
    console.log(`  ${status} ${result.originalName}: ${result.voiceId} ${result.speechWorks ? '(works)' : '(failed)'}`);
  });
  
  // Clean up
  await cleanupAllVoices(clonedVoices);
  
  // Final verdict
  if (uniqueVoiceIds.size >= 3 && workingVoices.length >= 3) {
    console.log('\n🎉 MULTIPLE VOICE CLONING TEST PASSED!');
    console.log('   ✅ Multiple unique voices cloned successfully');
    console.log('   ✅ Each voice has unique ID');
    console.log('   ✅ All cloned voices can generate speech');
    console.log('   ✅ System ready for narrator voice cloning');
    process.exit(0);
  } else {
    console.log('\n❌ MULTIPLE VOICE CLONING TEST FAILED');
    console.log(`   Need at least 3 unique working voices, got ${workingVoices.length}`);
    process.exit(1);
  }
}

// Run the test
runMultipleVoiceCloningTest();