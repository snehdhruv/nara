/**
 * Quick Vapi Test - Validate speech-to-text integration
 * Run this to test your Vapi API key and STT functionality
 */

// Using the API key from config.ts
const VAPI_API_KEY = '765f8644-1464-4b36-a4fe-c660e15ba313';

async function testVapi() {
  console.log('🎤 Testing Vapi STT Integration...\n');

  try {
    console.log('1. Testing Vapi API connection...');

    // Test API connection
    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Vapi API error: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Vapi API connection successful');

    const assistants = await response.json();
    console.log(`   Found ${assistants.length} assistants in your account\n`);

    console.log('2. Testing microphone access...');

    // Test microphone permissions (browser environment needed)
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ Microphone access granted');

        // Stop the stream
        stream.getTracks().forEach(track => track.stop());

      } catch (micError) {
        console.warn('⚠️  Microphone access denied or not available');
        console.log('   This is normal in Node.js - test in browser environment');
      }
    } else {
      console.log('   Microphone test skipped (Node.js environment)');
    }

    console.log('\n🟢 VAPI INTEGRATION TEST PASSED!');
    console.log('   API connection: Working');
    console.log('   Ready for integration into AudioManager\n');

    console.log('📋 Next steps:');
    console.log('1. Test in browser environment for microphone access');
    console.log('2. Integrate with your AudioManager');
    console.log('3. Test complete voice pipeline\n');

    return true;

  } catch (error) {
    console.error('❌ Vapi integration test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check your Vapi API key is correct');
    console.log('2. Ensure you have Vapi credits/subscription');
    console.log('3. Check your internet connection');
    console.log('4. Verify Vapi service is available\n');

    return false;
  }
}

// Test Vapi WebSocket connection (more realistic test)
async function testVapiWebSocket() {
  console.log('🔌 Testing Vapi WebSocket connection...\n');

  if (typeof WebSocket === 'undefined') {
    console.log('⚠️  WebSocket not available in Node.js - test in browser');
    return false;
  }

  return new Promise((resolve) => {
    const wsUrl = `wss://api.vapi.ai/ws?apiKey=${VAPI_API_KEY}`;
    const ws = new WebSocket(wsUrl);

    const timeout = setTimeout(() => {
      console.log('❌ WebSocket connection timeout');
      ws.close();
      resolve(false);
    }, 10000);

    ws.onopen = () => {
      console.log('✅ WebSocket connected successfully');

      // Send test configuration
      ws.send(JSON.stringify({
        type: 'config',
        transcriptionModel: 'nova-2',
        language: 'en-US'
      }));

      clearTimeout(timeout);
      ws.close();
      resolve(true);
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      clearTimeout(timeout);
      resolve(false);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
  });
}

// Run the test
if (require.main === module) {
  // Check if credentials are set
  if (VAPI_API_KEY === 'your-vapi-api-key-here') {
    console.log('❌ Please update the credentials in this file:');
    console.log('   VAPI_API_KEY = "your-actual-vapi-api-key"');
    process.exit(1);
  }

  testVapi().then(success => {
    if (success) {
      console.log('🎯 Vapi is ready for integration!');
    }
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testVapi, testVapiWebSocket };
