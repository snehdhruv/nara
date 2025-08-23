/**
 * INTEGRATION EXAMPLE - How other teams connect to the audio pipeline
 * Copy this file and modify for your team's integration
 */

import { AudioManager, TTSConfig } from './index';
import { LLMService, LLMRequest, LLMResponse } from '../interfaces/LLMInterface';
import { SpotifyService, SpotifyPlaybackState } from '../interfaces/SpotifyInterface';

// =============================================================================
// EXAMPLE FOR LLM TEAM: Replace the placeholder LLM service
// =============================================================================

class RealLLMService implements LLMService {
  async initialize(): Promise<void> {
    console.log('[RealLLMService] Initializing Claude integration...');
    // TODO: Initialize Claude, load spoiler prevention prompts
  }

  async processQuestion(request: LLMRequest): Promise<LLMResponse> {
    console.log(`[RealLLMService] Processing: "${request.userQuestion}"`);

    // TODO: Send to Claude with spoiler prevention
    // TODO: Use request.bookContext for spoiler-safe responses

    return {
      answer: "Real Claude response would go here",
      confidence: 0.9,
      spoilerRisk: 'none',
      sources: ['Chapter 1'],
      followUpSuggestions: ['Tell me more about this character']
    };
  }

  async updateBookContext(bookId: string, progress: number): Promise<void> {
    // TODO: Update spoiler prevention based on progress
  }

  getConfig() {
    return {
      model: 'claude-3-sonnet',
      temperature: 0.7,
      maxTokens: 500,
      spoilerGuardEnabled: true,
      contextWindow: 3
    };
  }
}

// =============================================================================
// EXAMPLE FOR AUTH/SPOTIFY TEAM: Replace the placeholder Spotify service
// =============================================================================

class RealSpotifyService implements SpotifyService {
  private accessToken: string | null = null;

  async initialize(): Promise<void> {
    console.log('[RealSpotifyService] Initializing Spotify Web API...');
    // TODO: Check for existing tokens, refresh if needed
  }

  async authenticate() {
    console.log('[RealSpotifyService] Starting OAuth flow...');
    // TODO: Real OAuth PKCE flow
    return {
      isAuthenticated: true,
      accessToken: 'real_token_here',
      refreshToken: 'real_refresh_token',
      expiresAt: Date.now() + 3600000,
      scopes: ['user-read-playback-state', 'user-modify-playback-state']
    };
  }

  async pause(): Promise<void> {
    console.log('[RealSpotifyService] Pausing via Web API...');
    // TODO: Call https://api.spotify.com/v1/me/player/pause
  }

  async resume(): Promise<void> {
    console.log('[RealSpotifyService] Resuming via Web API...');
    // TODO: Call https://api.spotify.com/v1/me/player/play
  }

  async getPlaybackState(): Promise<SpotifyPlaybackState> {
    console.log('[RealSpotifyService] Getting real playback state...');
    // TODO: Call https://api.spotify.com/v1/me/player

    return {
      isPlaying: true,
      track: {
        id: 'real_track_id',
        name: 'Real Audiobook Title',
        artists: ['Real Author'],
        duration: 1800000,
        isAudiobook: true
      },
      position: 450000,
      device: {
        id: 'real_device_id',
        name: 'User Device',
        type: 'computer',
        isActive: true,
        supportsVolume: true
      },
      volume: 75
    };
  }

  async getDevices() {
    // TODO: Call https://api.spotify.com/v1/me/player/devices
    return [];
  }

  async seek(positionMs: number): Promise<void> {
    // TODO: Call https://api.spotify.com/v1/me/player/seek
  }

  async transferPlayback(deviceId: string): Promise<void> {
    // TODO: Call https://api.spotify.com/v1/me/player
  }

  getAuthState() {
    return {
      isAuthenticated: this.accessToken !== null,
      accessToken: this.accessToken,
      refreshToken: null,
      expiresAt: null,
      scopes: []
    };
  }

  async refreshAccessToken(): Promise<string> {
    // TODO: Refresh OAuth token
    return 'refreshed_token';
  }
}

// =============================================================================
// INTEGRATION EXAMPLE: How to wire everything together
// =============================================================================

export async function integrateWithAudioPipeline() {
  console.log('🔌 INTEGRATION EXAMPLE: Connecting real services to audio pipeline');

  // 1. Configure TTS (Audio team's domain)
  const ttsConfig: TTSConfig = {
    apiKey: process.env.ELEVENLABS_API_KEY!,
    voiceId: process.env.NARRATOR_VOICE_ID!,
    model: 'eleven_turbo_v2',
    stability: 0.75,
    similarityBoost: 0.8,
    style: 0.2,
    useSpeakerBoost: true
  };

  // 2. Create audio manager with TTS config
  const audioManager = new AudioManager(ttsConfig);

  // 3. Replace placeholder services with real implementations
  // NOTE: This is conceptual - actual implementation may vary

  // LLM Team: Replace with your Claude service
  const realLLMService = new RealLLMService();
  // audioManager.setLLMService(realLLMService); // TODO: Add this method

  // Auth Team: Replace with your Spotify service
  const realSpotifyService = new RealSpotifyService();
  // audioManager.setSpotifyService(realSpotifyService); // TODO: Add this method

  // 4. Initialize complete pipeline
  await audioManager.initialize();

  // 5. Start voice activation
  await audioManager.startListening();

  console.log('✅ Complete audio pipeline with real services is running!');

  return audioManager;
}

// =============================================================================
// TESTING YOUR INTEGRATION
// =============================================================================

export async function testYourIntegration() {
  console.log('🧪 Testing your service integration...');

  try {
    // Test LLM service
    const llmService = new RealLLMService();
    await llmService.initialize();

    const testRequest: LLMRequest = {
      userQuestion: "Who is the main character?",
      bookContext: {
        title: "Test Book",
        author: "Test Author",
        currentChapter: 1,
        currentTimestamp: 300,
        userProgress: 25
      }
    };

    const llmResponse = await llmService.processQuestion(testRequest);
    console.log('✅ LLM integration test passed:', llmResponse.answer);

    // Test Spotify service
    const spotifyService = new RealSpotifyService();
    await spotifyService.initialize();

    const playbackState = await spotifyService.getPlaybackState();
    console.log('✅ Spotify integration test passed:', playbackState.track?.name);

    console.log('🟢 All integrations working!');
    return true;

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    return false;
  }
}

// Usage:
// import { integrateWithAudioPipeline, testYourIntegration } from './INTEGRATION_EXAMPLE';
// await testYourIntegration();
// const audioManager = await integrateWithAudioPipeline();
