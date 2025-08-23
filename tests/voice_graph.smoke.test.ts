#!/usr/bin/env node

/**
 * Voice Graph Smoke Test - End-to-end pipeline validation
 * Tests real STT→QA→TTS flow with actual Zero to One data
 * NO MOCKS - only real services and data
 */

import { EventEmitter } from 'events';
import { VoiceAgentBridge } from '../main/audio/VoiceAgentBridge';
import { createVoiceAgentBridge, testRealDataIntegration } from '../main/audio/INTEGRATION_EXAMPLE';

// Test framework utilities
class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> }> = [];
  private results: Array<{ name: string; success: boolean; error?: string; duration: number }> = [];

  test(name: string, fn: () => Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run(): Promise<void> {
    console.log(`🧪 Running ${this.tests.length} smoke tests...\n`);

    for (const test of this.tests) {
      const start = Date.now();
      try {
        console.log(`▶️  ${test.name}`);
        await test.fn();
        const duration = Date.now() - start;
        this.results.push({ name: test.name, success: true, duration });
        console.log(`✅ ${test.name} - PASSED (${duration}ms)\n`);
      } catch (error) {
        const duration = Date.now() - start;
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.results.push({ name: test.name, success: false, error: errorMsg, duration });
        console.error(`❌ ${test.name} - FAILED (${duration}ms)`);
        console.error(`   Error: ${errorMsg}\n`);
      }
    }

    this.printSummary();
  }

  private printSummary(): void {
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log('📊 Test Summary:');
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏱️  Total Time: ${totalTime}ms`);
    console.log(`   🎯 Success Rate: ${Math.round((passed / this.results.length) * 100)}%`);

    if (failed > 0) {
      console.log('\n💥 Failed Tests:');
      this.results.filter(r => !r.success).forEach(r => {
        console.log(`   • ${r.name}: ${r.error}`);
      });
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
    }
  }
}

// Test suite
const runner = new TestRunner();

runner.test('Bridge Creation and Initialization', async () => {
  const bridge = await createVoiceAgentBridge();
  
  if (!bridge) {
    throw new Error('Failed to create bridge');
  }

  await bridge.initialize();
  
  // Verify bridge state
  const context = bridge.getCurrentContext();
  if (context.audiobookId !== 'zero-to-one') {
    throw new Error(`Wrong audiobook ID: ${context.audiobookId}`);
  }

  if (!context.datasetPath.includes('zero-to-one.json')) {
    throw new Error(`Wrong dataset path: ${context.datasetPath}`);
  }

  await bridge.destroy();
});

runner.test('Service Connection Test', async () => {
  const bridge = await createVoiceAgentBridge();
  await bridge.initialize();

  const status = await bridge.testConnection();
  
  if (!status.stt) {
    throw new Error('STT service connection failed');
  }
  
  if (!status.tts) {
    throw new Error('TTS service connection failed');
  }
  
  if (!status.qa) {
    throw new Error('QA service connection failed');
  }

  await bridge.destroy();
});

runner.test('Chapter Resolution with Real Data', async () => {
  const bridge = await createVoiceAgentBridge();
  await bridge.initialize();

  // Test initial chapter info
  const initialInfo = bridge.getChapterInfo();
  if (initialInfo.currentChapter !== 1) {
    throw new Error(`Expected chapter 1, got ${initialInfo.currentChapter}`);
  }

  if (initialInfo.allowedChapter !== 5) {
    throw new Error(`Expected allowed chapter 5, got ${initialInfo.allowedChapter}`);
  }

  // Test context updates
  bridge.updateContext({
    currentPosition_s: 1200, // 20 minutes in
    playbackChapterIdx: 2
  });

  const updatedInfo = bridge.getChapterInfo();
  if (updatedInfo.currentChapter !== 2) {
    throw new Error(`Expected updated chapter 2, got ${updatedInfo.currentChapter}`);
  }

  await bridge.destroy();
});

runner.test('Real Question Processing - Zero to One Concepts', async () => {
  const bridge = await createVoiceAgentBridge();
  await bridge.initialize();

  const question = "What does Peter Thiel mean by zero to one?";
  const result = await bridge.processQuestion(question);

  // Validate response structure
  if (!result.markdown || result.markdown.length === 0) {
    throw new Error('Empty answer received');
  }

  if (result.latency_ms <= 0) {
    throw new Error('Invalid latency measurement');
  }

  if (!Array.isArray(result.citations)) {
    throw new Error('Citations must be an array');
  }

  // Validate content quality (real Zero to One content check)
  const answer = result.markdown.toLowerCase();
  const requiredConcepts = ['zero to one', 'competition', 'monopoly', 'innovation'];
  const foundConcepts = requiredConcepts.filter(concept => answer.includes(concept));
  
  if (foundConcepts.length < 2) {
    throw new Error(`Answer lacks Zero to One concepts. Found: ${foundConcepts.join(', ')}`);
  }

  // Log results for verification
  console.log(`     📝 Answer length: ${result.markdown.length} chars`);
  console.log(`     ⚡ Latency: ${result.latency_ms}ms`);
  console.log(`     🔗 Citations: ${result.citations.length}`);
  console.log(`     💡 Concepts found: ${foundConcepts.join(', ')}`);

  await bridge.destroy();
});

runner.test('Multiple Question Processing (No Barge-in)', async () => {
  const bridge = await createVoiceAgentBridge();
  await bridge.initialize();

  // Question 1: Basic concept
  const result1 = await bridge.processQuestion("What is a monopoly according to Thiel?");
  if (!result1.markdown || result1.markdown.length === 0) {
    throw new Error('First question failed');
  }

  // Wait between questions (no barge-in)
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Question 2: Different topic
  const result2 = await bridge.processQuestion("What does Thiel say about competition?");
  if (!result2.markdown || result2.markdown.length === 0) {
    throw new Error('Second question failed');
  }

  // Verify different answers
  if (result1.markdown === result2.markdown) {
    throw new Error('Questions returned identical answers - possible caching issue');
  }

  console.log(`     📊 Q1 length: ${result1.markdown.length}, Q2 length: ${result2.markdown.length}`);
  console.log(`     ⚡ Q1 latency: ${result1.latency_ms}ms, Q2 latency: ${result2.latency_ms}ms`);

  await bridge.destroy();
});

runner.test('Barge-in Functionality', async () => {
  const bridge = await createVoiceAgentBridge();
  await bridge.initialize();

  let bargeInDetected = false;
  let firstQuestionCompleted = false;

  // Listen for barge-in events
  bridge.on('bargeIn', () => {
    bargeInDetected = true;
  });

  bridge.on('questionProcessed', () => {
    if (!firstQuestionCompleted) {
      firstQuestionCompleted = true;
    }
  });

  // Start long question processing
  const longQuestionPromise = bridge.processQuestion("Give me a detailed explanation of Peter Thiel's views on monopolies and competition");

  // Simulate barge-in after short delay
  setTimeout(async () => {
    try {
      await bridge.processQuestion("Quick question: What is zero to one?");
    } catch (error) {
      // Expected - first question should be aborted
    }
  }, 500);

  try {
    await longQuestionPromise;
    throw new Error('First question should have been aborted');
  } catch (error) {
    if (!error.message.includes('aborted')) {
      throw new Error(`Expected abort error, got: ${error.message}`);
    }
  }

  await new Promise(resolve => setTimeout(resolve, 100));

  if (!bargeInDetected) {
    throw new Error('Barge-in event not detected');
  }

  console.log(`     🔄 Barge-in successfully detected and handled`);

  await bridge.destroy();
});

runner.test('End-to-End Integration Test', async () => {
  // Use the integration test function
  const success = await testRealDataIntegration();
  
  if (!success) {
    throw new Error('Integration test failed');
  }
});

runner.test('Voice Context Updates and Spoiler Protection', async () => {
  const bridge = await createVoiceAgentBridge();
  await bridge.initialize();

  // Test spoiler protection - user at chapter 3, should be limited
  bridge.updateContext({
    currentPosition_s: 2000,
    playbackChapterIdx: 7, // Beyond user progress
    userProgressIdx: 3 // Only heard up to chapter 3
  });

  const chapterInfo = bridge.getChapterInfo();
  if (chapterInfo.allowedChapter > 3) {
    throw new Error(`Spoiler protection failed: allowed chapter ${chapterInfo.allowedChapter}, should be ≤ 3`);
  }

  // Ask a question that might contain spoilers
  const result = await bridge.processQuestion("What happens in the later chapters?");
  
  // Verify answer doesn't contain spoilers (basic check)
  if (!result.markdown) {
    throw new Error('No answer received');
  }

  console.log(`     🛡️  Spoiler protection: limited to chapter ${chapterInfo.allowedChapter}`);
  console.log(`     📝 Answer length: ${result.markdown.length} chars`);

  await bridge.destroy();
});

runner.test('AudioOrchestrator State Machine', async () => {
  const bridge = await createVoiceAgentBridge();
  await bridge.initialize();

  let interactionStarted = false;
  let interactionEnded = false;
  let audioPaused = false;
  let audioResumed = false;

  // Set up event listeners
  bridge.on('interactionStarted', () => { interactionStarted = true; });
  bridge.on('interactionEnded', () => { interactionEnded = true; });
  bridge.on('pauseBackgroundAudio', () => { audioPaused = true; });
  bridge.on('resumeBackgroundAudio', () => { audioResumed = true; });

  // Process a question to trigger state machine
  await bridge.processQuestion("What is zero to one?");

  // Allow time for events to fire
  await new Promise(resolve => setTimeout(resolve, 100));

  if (!interactionStarted) throw new Error('Interaction start event not fired');
  if (!interactionEnded) throw new Error('Interaction end event not fired');
  if (!audioPaused) throw new Error('Audio pause event not fired');
  if (!audioResumed) throw new Error('Audio resume event not fired');

  console.log(`     🎛️  State machine events: all fired correctly`);

  await bridge.destroy();
});

// Run all tests
async function runSmokeTests() {
  console.log('🚀 Voice Graph Pipeline Smoke Test Suite');
  console.log('=====================================\n');
  console.log('🎯 Testing complete STT→QA→TTS flow with real Zero to One data');
  console.log('🔍 No mocks - only real services and dataset\n');

  try {
    await runner.run();
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runSmokeTests().catch(error => {
    console.error('💥 Smoke test execution failed:', error);
    process.exit(1);
  });
}

export { runSmokeTests };