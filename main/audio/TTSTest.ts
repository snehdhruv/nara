/**
 * TTS Test - Validate your ElevenLabs integration
 * Run this to test TTS before full pipeline integration
 */

import { TTSService, TTSConfig } from './TTSService';
import { AudioPlayer } from './AudioPlayer';

export class TTSTest {
  private tts: TTSService;
  private player: AudioPlayer;

  constructor(apiKey: string, voiceId: string) {
    const ttsConfig: TTSConfig = {
      apiKey,
      voiceId,
      model: 'eleven_turbo_v2', // Fastest for testing
      stability: 0.75,
      similarityBoost: 0.8,
      style: 0.2,
      useSpeakerBoost: true
    };

    this.tts = new TTSService(ttsConfig);
    this.player = new AudioPlayer({
      volume: 80,
      format: 'mp3'
    });
  }

  async runTTSValidation(): Promise<{ success: boolean; metrics: any }> {
    console.log('\n🗣️ TESTING TTS INTEGRATION 🗣️\n');

    try {
      // Initialize services
      console.log('Initializing TTS service...');
      await this.tts.initialize();

      console.log('Initializing audio player...');
      await this.player.initialize();

      // Test 1: Quick synthesis
      console.log('\n🧪 Test 1: Quick TTS synthesis');
      const quickText = "This is a test of the TTS system.";
      const startTime = Date.now();

      const ttsResponse = await this.tts.synthesizeQuick(quickText);
      const synthesisTime = Date.now() - startTime;

      console.log(`✅ TTS synthesis completed in ${synthesisTime}ms`);
      console.log(`📊 Estimated audio duration: ${ttsResponse.duration}ms`);

      // Test 2: Audio playback
      console.log('\n🧪 Test 2: Audio playback');
      const playbackStart = Date.now();

      await this.player.playStream(ttsResponse.audioStream);
      const totalTime = Date.now() - playbackStart;

      console.log(`✅ Audio playback completed in ${totalTime}ms`);

      // Test 3: Longer text (narrator response simulation)
      console.log('\n🧪 Test 3: Narrator response simulation');
      const narratorText = `The main character, Elizabeth Bennet, is a spirited young woman who values independence and intelligence. In this chapter, she encounters Mr. Darcy at the ball, where their initial impressions of each other are quite unfavorable. This meeting sets the stage for the complex relationship that will develop throughout the story.`;

      const longStart = Date.now();
      const longResponse = await this.tts.synthesizeText(narratorText);
      const longSynthesis = Date.now() - longStart;

      console.log(`✅ Long text synthesis: ${longSynthesis}ms`);
      console.log(`📊 Audio duration: ${longResponse.duration}ms`);

      // Play the longer response
      await this.player.playStream(longResponse.audioStream);
      const longTotal = Date.now() - longStart;

      console.log(`✅ Complete long response: ${longTotal}ms`);

      // Get metrics
      const ttsMetrics = this.tts.getMetrics();
      const playerMetrics = this.player.getMetrics();

      console.log('\n📊 TTS PERFORMANCE METRICS:');
      console.log('================================');
      console.log(`Request Latency: ${ttsMetrics.requestLatency}ms`);
      console.log(`Synthesis Duration: ${ttsMetrics.totalDuration}ms`);
      console.log(`Playback Latency: ${playerMetrics.latencyToFirstSound}ms`);
      console.log(`Average Latency: ${playerMetrics.averageLatency}ms`);

      // Validate against targets
      const targets = {
        synthesisLatency: 3000, // 3s target for first audio
        playbackLatency: 500,   // 500ms to start playing
      };

      const success =
        ttsMetrics.requestLatency <= targets.synthesisLatency &&
        playerMetrics.latencyToFirstSound <= targets.playbackLatency;

      console.log(`\n${success ? '🟢 TTS READY FOR DEMO' : '🔴 TTS NEEDS OPTIMIZATION'}`);

      return {
        success,
        metrics: {
          tts: ttsMetrics,
          player: playerMetrics,
          targets
        }
      };

    } catch (error) {
      console.error('❌ TTS test failed:', error);
      return { success: false, metrics: null };
    }
  }

  // Test just the API connection (no audio playback)
  async quickAPITest(): Promise<boolean> {
    console.log('🔌 Quick TTS API test...');

    try {
      await this.tts.initialize();

      const testResponse = await this.tts.synthesizeText("API test", {
        priority: 'high'
      });

      // Don't play, just verify we got audio data
      testResponse.audioStream.destroy();

      console.log('✅ TTS API connection successful');
      return true;

    } catch (error) {
      console.error('❌ TTS API test failed:', error);
      return false;
    }
  }
}

// Export test functions for easy use
export async function testTTS(apiKey: string, voiceId: string): Promise<void> {
  const test = new TTSTest(apiKey, voiceId);
  await test.runTTSValidation();
}

export async function quickTTSTest(apiKey: string, voiceId: string): Promise<boolean> {
  const test = new TTSTest(apiKey, voiceId);
  return await test.quickAPITest();
}

// Usage example:
// import { testTTS } from './TTSTest';
// await testTTS('your-elevenlabs-api-key', 'your-voice-id');
