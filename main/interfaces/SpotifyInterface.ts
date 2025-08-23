/**
 * Spotify Interface - Clean contract for the Auth/Spotify team
 * THEIR DOMAIN: OAuth + Spotify Web API integration
 */

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string[];
  duration: number; // milliseconds
  isAudiobook: boolean;
  chapters?: SpotifyChapter[];
}

export interface SpotifyChapter {
  id: string;
  name: string;
  startTime: number; // milliseconds
  duration: number; // milliseconds
  chapterNumber: number;
}

export interface SpotifyPlaybackState {
  isPlaying: boolean;
  track: SpotifyTrack | null;
  position: number; // milliseconds
  device: SpotifyDevice | null;
  volume: number; // 0-100
}

export interface SpotifyDevice {
  id: string;
  name: string;
  type: 'computer' | 'smartphone' | 'speaker';
  isActive: boolean;
  supportsVolume: boolean;
}

export interface SpotifyAuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  scopes: string[];
}

/**
 * PLACEHOLDER IMPLEMENTATION
 * Auth team will replace this with real Spotify Web API integration
 */
export class SpotifyService {
  private authState: SpotifyAuthState;

  constructor() {
    this.authState = {
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      scopes: []
    };
  }

  async initialize(): Promise<void> {
    console.log('[SpotifyService] PLACEHOLDER - Auth team will implement');
    // Auth team: Initialize OAuth flow, check existing tokens
  }

  async authenticate(): Promise<SpotifyAuthState> {
    console.log('[SpotifyService] PLACEHOLDER - Starting OAuth flow');

    // PLACEHOLDER: Mock successful auth for audio team testing
    this.authState = {
      isAuthenticated: true,
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
      expiresAt: Date.now() + 3600000, // 1 hour
      scopes: ['user-read-playback-state', 'user-modify-playback-state']
    };

    return this.authState;
  }

  async getPlaybackState(): Promise<SpotifyPlaybackState> {
    console.log('[SpotifyService] PLACEHOLDER - Getting playback state');

    // PLACEHOLDER: Return mock playback state
    return {
      isPlaying: true,
      track: {
        id: 'mock_track_id',
        name: 'Sample Audiobook Chapter 1',
        artists: ['Sample Author'],
        duration: 1800000, // 30 minutes
        isAudiobook: true,
        chapters: [
          {
            id: 'chapter_1',
            name: 'Chapter 1: The Beginning',
            startTime: 0,
            duration: 1800000,
            chapterNumber: 1
          }
        ]
      },
      position: 450000, // 7.5 minutes in
      device: {
        id: 'mock_device',
        name: 'MacBook Pro',
        type: 'computer',
        isActive: true,
        supportsVolume: true
      },
      volume: 75
    };
  }

  async pause(): Promise<void> {
    console.log('[SpotifyService] PLACEHOLDER - Pausing playback');
    // Auth team: Call Spotify Web API to pause
  }

  async resume(): Promise<void> {
    console.log('[SpotifyService] PLACEHOLDER - Resuming playback');
    // Auth team: Call Spotify Web API to resume
  }

  async seek(positionMs: number): Promise<void> {
    console.log(`[SpotifyService] PLACEHOLDER - Seeking to ${positionMs}ms`);
    // Auth team: Call Spotify Web API to seek
  }

  async getDevices(): Promise<SpotifyDevice[]> {
    console.log('[SpotifyService] PLACEHOLDER - Getting available devices');

    // PLACEHOLDER: Return mock devices
    return [
      {
        id: 'mock_device_1',
        name: 'MacBook Pro',
        type: 'computer',
        isActive: true,
        supportsVolume: true
      },
      {
        id: 'mock_device_2',
        name: 'iPhone',
        type: 'smartphone',
        isActive: false,
        supportsVolume: true
      }
    ];
  }

  async transferPlayback(deviceId: string): Promise<void> {
    console.log(`[SpotifyService] PLACEHOLDER - Transferring to device ${deviceId}`);
    // Auth team: Transfer playback to specified device
  }

  getAuthState(): SpotifyAuthState {
    return { ...this.authState };
  }

  async refreshAccessToken(): Promise<string> {
    console.log('[SpotifyService] PLACEHOLDER - Refreshing access token');
    // Auth team: Refresh OAuth token
    return 'mock_refreshed_token';
  }
}

// Export factory function for audio team
export const createSpotifyService = (): SpotifyService => {
  return new SpotifyService();
};
