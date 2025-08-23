/**
 * REAL VOICE AGENT BRIDGE INTEGRATION - Complete STT→QA→TTS pipeline
 * Uses actual Zero to One dataset and real services
 */

import { VoiceAgentBridge, VoiceContext } from './VoiceAgentBridge';
import { AudioManager } from './AudioManager';
import { VapiService } from './VapiService';
import { TTSService } from './TTSService';
import { createLangGraphRunner } from '../../agents/langgraph/adapters/Runner';
import { getAudioConfig } from './config';

// =============================================================================
// REAL INTEGRATION: Complete Voice Agent Bridge setup
// =============================================================================

export async function createVoiceAgentBridge(): Promise<VoiceAgentBridge> {
  console.log('🔌 Creating real Voice Agent Bridge with Zero to One dataset...');

  // 1. Get validated audio configuration with real API keys
  const audioConfig = getAudioConfig();

  // 2. Create real services (no mocks!)
  const vapi = new VapiService(audioConfig.vapi);
  const tts = new TTSService(audioConfig.tts);
  const audio = new AudioManager({
    vapi: audioConfig.vapi,
    tts: audioConfig.tts
  });

  // 3. Create LangGraph runner using real runChapterQA function
  const runner = createLangGraphRunner();

  // 4. Setup voice context for Zero to One audiobook
  const context: VoiceContext = {
    audiobookId: 'zero-to-one',
    datasetPath: './data/zero-to-one.json',
    currentPosition_s: 0, // Start of audiobook
    playbackChapterIdx: 1, // Currently on Chapter 1
    userProgressIdx: 14, // Allow access to entire audiobook (all 14 chapters)
    modeHint: 'auto' // Let system decide packing strategy
  };

  // 5. Create the bridge
  const bridge = new VoiceAgentBridge({
    vapi,
    tts,
    audio,
    runner,
    context
  });

  return bridge;
}

// =============================================================================
// COMPLETE INTEGRATION FLOW
// =============================================================================

export async function initializeCompletePipeline(): Promise<VoiceAgentBridge> {
  console.log('🚀 Initializing complete voice pipeline...');

  try {
    // Create bridge with real services
    const bridge = await createVoiceAgentBridge();

    // Setup event logging for demonstration
    setupBridgeLogging(bridge);

    // Initialize all services
    await bridge.initialize();

    // Test all connections
    const connectionStatus = await bridge.testConnection();
    console.log('🔗 Connection Status:', connectionStatus);

    if (!connectionStatus.stt || !connectionStatus.tts || !connectionStatus.qa) {
      throw new Error('One or more services failed connection test');
    }

    console.log('✅ Complete voice pipeline ready!');
    return bridge;

  } catch (error) {
    console.error('❌ Pipeline initialization failed:', error);
    throw error;
  }
}

// =============================================================================
// DEMONSTRATION FUNCTIONS
// =============================================================================

export async function demonstrateVoicePipeline(): Promise<void> {
  console.log('🎤 Demonstrating complete voice pipeline...');

  const bridge = await initializeCompletePipeline();

  try {
    // Start wake word listening
    console.log('👂 Starting wake word listening for "Hey Nara"...');
    await bridge.startWakeWordListening();

    // Simulate voice questions (for testing without actual speech)
    console.log('🗣️  Simulating voice questions...');
    
    // Test 1: Basic concept question
    const result1 = await bridge.processQuestion("What does Peter Thiel mean by zero to one?");
    console.log('📝 Answer 1:', result1.markdown.substring(0, 200) + '...');
    console.log('⚡ Latency:', result1.latency_ms + 'ms');

    // Small delay between questions
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Specific chapter question
    const result2 = await bridge.processQuestion("What are the characteristics of monopolies according to Thiel?");
    console.log('📝 Answer 2:', result2.markdown.substring(0, 200) + '...');
    console.log('⚡ Latency:', result2.latency_ms + 'ms');

    // Test 3: Question with playback hint
    const result3 = await bridge.processQuestion("Give me examples of monopoly companies mentioned in the book");
    console.log('📝 Answer 3:', result3.markdown.substring(0, 200) + '...');
    if (result3.playbackHint) {
      console.log('⏯️  Seek hint: Chapter', result3.playbackHint.chapter_idx, 'at', result3.playbackHint.start_s, 'seconds');
    }

    console.log('🎉 Voice pipeline demonstration complete!');

  } finally {
    await bridge.destroy();
  }
}

// =============================================================================
// TESTING WITH REAL DATA
// =============================================================================

export async function testRealDataIntegration(): Promise<boolean> {
  console.log('🧪 Testing real data integration...');

  try {
    const bridge = await createVoiceAgentBridge();
    await bridge.initialize();

    // Test chapter resolution with real dataset
    const chapterInfo = bridge.getChapterInfo();
    console.log('📖 Chapter info:', chapterInfo);

    // Test context updates
    bridge.updateContext({
      currentPosition_s: 1200, // 20 minutes into audiobook
      playbackChapterIdx: 2 // Now in Chapter 2
    });

    const updatedInfo = bridge.getChapterInfo();
    console.log('📖 Updated chapter info:', updatedInfo);

    // Test real question processing
    const result = await bridge.processQuestion("What is competition according to Peter Thiel?");
    
    // Validate result structure
    if (!result.markdown || result.markdown.length === 0) {
      throw new Error('Empty answer received');
    }

    if (!result.citations || result.citations.length === 0) {
      console.warn('⚠️  No citations in answer');
    } else {
      console.log('🔗 Citations:', result.citations.length);
    }

    if (result.latency_ms <= 0) {
      throw new Error('Invalid latency measurement');
    }

    console.log('✅ Real data integration test passed!');
    console.log('📊 Answer length:', result.markdown.length, 'characters');
    console.log('⚡ Response time:', result.latency_ms, 'ms');

    await bridge.destroy();
    return true;

  } catch (error) {
    console.error('❌ Real data integration test failed:', error);
    return false;
  }
}

// =============================================================================
// EVENT LOGGING SETUP
// =============================================================================

function setupBridgeLogging(bridge: VoiceAgentBridge): void {
  bridge.on('ready', () => {
    console.log('🟢 Bridge ready');
  });

  bridge.on('wakeWordDetected', (detection) => {
    console.log(`🎯 Wake word: "${detection.phrase}" (${Math.round(detection.confidence * 100)}%)`);
  });

  bridge.on('questionProcessed', (result) => {
    console.log(`💬 Question processed: ${result.interactionId} (${result.latency_ms}ms)`);
  });

  bridge.on('pauseBackgroundAudio', (interactionId) => {
    console.log(`⏸️  Paused audio for: ${interactionId}`);
  });

  bridge.on('resumeBackgroundAudio', (interactionId) => {
    console.log(`▶️  Resumed audio after: ${interactionId}`);
  });

  bridge.on('bargeIn', ({ previousId, newId }) => {
    console.log(`🔄 Barge-in: ${previousId} → ${newId}`);
  });

  bridge.on('seekRequested', (position) => {
    console.log(`⏭️  Seek to: ${position}s`);
  });
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// For Next.js integration:
// import { createVoiceAgentBridge } from './INTEGRATION_EXAMPLE';
// const bridge = await createVoiceAgentBridge();

// For testing:
// import { testRealDataIntegration, demonstrateVoicePipeline } from './INTEGRATION_EXAMPLE';
// await testRealDataIntegration();
// await demonstrateVoicePipeline();
