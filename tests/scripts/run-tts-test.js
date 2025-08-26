/**
 * Run TTS Test with current environment variables
 */

const { quickTTSTest } = require('./main/audio/TTSTest');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.NEXT_PUBLIC_TTS_VOICE_ID;

console.log('🔧 TTS Test Configuration:');
console.log(`API Key: ${API_KEY ? API_KEY.slice(0, 8) + '...' : 'NOT SET'}`);
console.log(`Voice ID: ${VOICE_ID || 'NOT SET'}`);
console.log('');

if (!API_KEY || !VOICE_ID) {
  console.error('❌ Missing API_KEY or VOICE_ID in environment variables');
  process.exit(1);
}

// Run the quick API test
async function runTest() {
  try {
    const success = await quickTTSTest(API_KEY, VOICE_ID);
    console.log(`\n${success ? '✅ TTS test passed!' : '❌ TTS test failed!'}`);
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

runTest();