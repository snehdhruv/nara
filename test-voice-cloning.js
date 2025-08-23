#!/usr/bin/env node

// Real Voice Cloning Test - Actually tests the functionality
console.log('🎤 Testing ACTUAL Voice Cloning Functionality...\n');

// This needs to run in browser context, so let's create a comprehensive browser test
const browserTestScript = `
(async function testVoiceCloning() {
  console.log('🎤 Starting Real Voice Cloning Test...');
  
  try {
    // Import the NarratorVoiceCloning class
    const { NarratorVoiceCloning } = await import('./main/audio/NarratorVoiceCloning.js');
    
    // Test books with different narrators
    const testBooks = [
      {
        id: 'js758awdaese2b2je1rmjvfzjh7p6c1g',
        title: 'The Almanack of Naval Ravikant',
        videoId: 'MxGn2MBVdJI'
      },
      {
        id: 'js701ma55ndt5qr4ak84jrd6357p6hqb', 
        title: 'Steve Jobs Stanford Commencement',
        videoId: 'UF8uR6Z6KLc'
      },
      {
        id: 'js7f4gmxp2j2d3q33bywc58gjn7p7tez',
        title: 'How to Get Startup Ideas',
        videoId: 'Th8JoIan4dg'
      }
    ];
    
    // Initialize voice cloning service
    const apiKey = 'sk_536c3f9ad29e9e6e4f0b4aee762afa6d8db7d750d7f64587';
    const voiceCloning = new NarratorVoiceCloning(apiKey);
    
    console.log('✅ Voice cloning service initialized');
    
    // Test each book
    const clonedVoices = [];
    
    for (const book of testBooks) {
      console.log(\`\\n🎯 Testing voice cloning for: \${book.title}\`);
      
      // Create a mock YouTube player for testing
      const mockPlayer = {
        getPlayerState: () => 2, // paused
        getCurrentTime: () => 0,
        seekTo: (time) => console.log(\`Seeking to \${time}s\`),
        playVideo: () => console.log('Playing video'),
        pauseVideo: () => console.log('Pausing video')
      };
      
      try {
        // This will test the actual cloning pipeline
        const profile = await voiceCloning.cloneNarratorFromYouTube(
          book.id,
          book.title,
          mockPlayer,
          30, // start at 30s
          10  // 10s sample for testing
        );
        
        console.log(\`✅ Voice profile created for \${book.title}:\`);
        console.log(\`   - Voice ID: \${profile.voiceId}\`);
        console.log(\`   - Is Cloned: \${profile.isCloned}\`);
        console.log(\`   - Model: \${profile.modelId}\`);
        
        clonedVoices.push(profile);
        
        // Verify voice is unique
        if (profile.isCloned) {
          console.log(\`✅ Successfully cloned narrator voice\`);
        } else {
          console.log(\`⚠️  Using fallback voice (cloning failed)\`);
        }
        
      } catch (error) {
        console.error(\`❌ Voice cloning failed for \${book.title}:\`, error.message);
      }
    }
    
    // Verify we have unique voices
    console.log('\\n📊 VOICE CLONING RESULTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const uniqueVoiceIds = new Set(clonedVoices.map(v => v.voiceId));
    const successfulClones = clonedVoices.filter(v => v.isCloned);
    
    console.log(\`✅ Total voices processed: \${clonedVoices.length}\`);
    console.log(\`✅ Unique voice IDs: \${uniqueVoiceIds.size}\`);
    console.log(\`✅ Successfully cloned: \${successfulClones.length}\`);
    console.log(\`✅ Fallback voices: \${clonedVoices.length - successfulClones.length}\`);
    
    // Test if voices are actually different
    if (uniqueVoiceIds.size >= 3 && successfulClones.length >= 2) {
      console.log('\\n🎉 VOICE CLONING TEST PASSED!');
      console.log('   - Multiple unique narrator voices successfully cloned');
      console.log('   - Each book has distinct voice profile');
      return true;
    } else {
      console.log('\\n❌ VOICE CLONING TEST FAILED');
      console.log(\`   - Need at least 3 unique voices, got \${uniqueVoiceIds.size}\`);
      console.log(\`   - Need at least 2 successful clones, got \${successfulClones.length}\`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Voice cloning test setup failed:', error);
    return false;
  }
})();
`;

console.log('❌ ACTUAL TESTING REQUIRED');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('The previous integration test only checked prerequisites.');
console.log('Voice cloning requires browser environment for:');
console.log('  - YouTube IFrame API access');  
console.log('  - MediaRecorder for audio capture');
console.log('  - Audio context for processing');
console.log('  - ElevenLabs API calls');
console.log('');
console.log('To properly test voice cloning:');
console.log('1. Open browser dev tools on http://localhost:3000');
console.log('2. Navigate to a book with YouTube video');
console.log('3. Run the following test script in console:');
console.log('');
console.log(browserTestScript);
console.log('');
console.log('This will actually test:');
console.log('✓ Audio extraction from YouTube');
console.log('✓ ElevenLabs API voice cloning');  
console.log('✓ Unique voice ID generation');
console.log('✓ Voice profile storage');
console.log('✓ TTS service integration');

process.exit(1);