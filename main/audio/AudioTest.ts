/**
 * AudioTest - Risk validation for critical audio components
 * Run this FIRST to validate the highest-risk parts work
 */

import { AudioManager } from './AudioManager';

export class AudioTest {
  private audioManager: AudioManager;
  private testResults: { [key: string]: boolean } = {};

  constructor() {
    this.audioManager = new AudioManager();
  }

  async runRiskValidation(): Promise<{ success: boolean; results: any }> {
    console.log('\n🔥 RUNNING HIGH-RISK AUDIO COMPONENT TESTS 🔥\n');

    try {
      // Test 1: Audio Manager Initialization
      await this.testAudioManagerInit();

      // Test 2: Spotify/Audible Detection & Control
      await this.testPlaybackControl();

      // Test 3: Device Enumeration & Feedback Prevention
      await this.testDeviceRouting();

      // Test 4: VAD Responsiveness (simulated)
      await this.testVADLatency();

      // Test 5: End-to-End Pipeline Simulation
      await this.testPipelineLatency();

      const success = Object.values(this.testResults).every(Boolean);

      console.log('\n📊 RISK VALIDATION RESULTS:');
      console.log('================================');
      Object.entries(this.testResults).forEach(([test, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${test}`);
      });
      console.log(`\nOverall: ${success ? '🟢 READY FOR DEMO' : '🔴 NEEDS FIXES'}\n`);

      return { success, results: this.testResults };

    } catch (error) {
      console.error('❌ Risk validation failed:', error);
      return { success: false, results: this.testResults };
    }
  }

  private async testAudioManagerInit(): Promise<void> {
    console.log('🧪 Testing AudioManager initialization...');

    try {
      await this.audioManager.initialize();
      this.testResults['AudioManager Init'] = true;
      console.log('✅ AudioManager initialized successfully');

    } catch (error) {
      this.testResults['AudioManager Init'] = false;
      console.error('❌ AudioManager init failed:', error);
      throw error;
    }
  }

  private async testPlaybackControl(): Promise<void> {
    console.log('🧪 Testing Spotify/Audible playback control...');

    try {
      // Test manual pause/resume (most critical for demo)
      await this.audioManager.manualPause();
      console.log('✅ Manual pause command sent');

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 500));

      await this.audioManager.manualResume();
      console.log('✅ Manual resume command sent');

      this.testResults['Playback Control'] = true;

    } catch (error) {
      this.testResults['Playback Control'] = false;
      console.error('❌ Playback control failed:', error);
      console.warn('⚠️  Make sure Spotify or Audible is running and playing audio');
    }
  }

  private async testDeviceRouting(): Promise<void> {
    console.log('🧪 Testing audio device routing...');

    try {
      const state = this.audioManager.getState();
      const hasDevice = state.currentDevice !== null;

      this.testResults['Device Routing'] = hasDevice;

      if (hasDevice) {
        console.log('✅ Audio devices detected and configured');
      } else {
        console.warn('⚠️  No audio devices configured - check DeviceRouter');
      }

    } catch (error) {
      this.testResults['Device Routing'] = false;
      console.error('❌ Device routing test failed:', error);
    }
  }

  private async testVADLatency(): Promise<void> {
    console.log('🧪 Testing VAD response latency...');

    try {
      let vadTriggered = false;
      let latency = 0;

      // Listen for VAD events
      this.audioManager.on('playbackPaused', (data) => {
        vadTriggered = true;
        latency = data.latency;
      });

      // Start listening
      await this.audioManager.startListening();

      // Simulate speech detection (for testing)
      const startTime = Date.now();
      // Note: In real test, you'd speak into the microphone
      // For now, we'll trigger manually
      setTimeout(() => {
        // Trigger manual VAD for testing
        console.log('🎤 Simulating speech detection...');
        this.audioManager.emit('speechStart');
      }, 100);

      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 2000));

      await this.audioManager.stopListening();

      const targetLatency = 800; // 800ms target
      const passed = vadTriggered && latency <= targetLatency;

      this.testResults['VAD Latency'] = passed;

      if (passed) {
        console.log(`✅ VAD latency: ${latency}ms (target: ≤${targetLatency}ms)`);
      } else {
        console.warn(`⚠️  VAD latency: ${latency}ms (exceeds ${targetLatency}ms target)`);
      }

    } catch (error) {
      this.testResults['VAD Latency'] = false;
      console.error('❌ VAD latency test failed:', error);
    }
  }

  private async testPipelineLatency(): Promise<void> {
    console.log('🧪 Testing end-to-end pipeline latency...');

    try {
      const state = this.audioManager.getState();
      const metrics = state.latencyMetrics;

      // Check if we have any latency measurements
      const hasMetrics = Object.values(metrics).some(val => val !== null);

      this.testResults['Pipeline Latency'] = hasMetrics;

      if (hasMetrics) {
        console.log('✅ Pipeline latency metrics available:');
        console.log(`   VAD → Spotify Pause: ${metrics.vadToSpotifyPause}ms`);
        console.log(`   STT → TTS: ${metrics.sttToTTS}ms`);
        console.log(`   TTS End → Resume: ${metrics.ttsEndToResume}ms`);
      } else {
        console.warn('⚠️  No pipeline latency metrics yet - run full voice test');
      }

    } catch (error) {
      this.testResults['Pipeline Latency'] = false;
      console.error('❌ Pipeline latency test failed:', error);
    }
  }

  // Quick demo readiness check
  async quickDemoCheck(): Promise<boolean> {
    console.log('🚀 QUICK DEMO READINESS CHECK');
    console.log('============================');

    try {
      await this.audioManager.initialize();

      // Test critical path: manual pause/resume
      console.log('Testing manual pause...');
      await this.audioManager.manualPause();

      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Testing manual resume...');
      await this.audioManager.manualResume();

      console.log('✅ DEMO READY - Manual controls work');
      return true;

    } catch (error) {
      console.error('❌ DEMO NOT READY:', error);
      return false;
    }
  }
}

// Export for easy testing
export async function runAudioRiskValidation(): Promise<void> {
  const test = new AudioTest();
  await test.runRiskValidation();
}

export async function quickDemoCheck(): Promise<boolean> {
  const test = new AudioTest();
  return await test.quickDemoCheck();
}
