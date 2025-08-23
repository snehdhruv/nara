/**
 * Narrator Voice Matching Extension for ElevenLabs TTS
 * Matches audiobook narrators to closest ElevenLabs voices for consistency
 * Fast, reliable, no API limits - maintains fourth wall perfectly
 */

import { EventEmitter } from 'events';
import { TTSService, TTSConfig } from './TTSService';
import { VoiceMatching, NarratorVoiceMatch, createVoiceMatching } from './VoiceMatching';

export interface NarratorVoiceProfile {
  bookId: string;
  bookTitle: string;
  voiceId: string;
  originalVoiceId?: string;
  isMatched: boolean; // Changed from isCloned
  modelId: string;
  settings: {
    stability: number;
    similarityBoost: number;
    style: number;
    useSpeakerBoost: boolean;
  };
  createdAt: number;
  matchConfidence?: number; // New field for match quality
  voiceName?: string; // ElevenLabs voice name
}

export class NarratorVoiceCloning extends EventEmitter {
  private profiles: Map<string, NarratorVoiceProfile> = new Map();
  private ttsService: TTSService | null = null;
  private voiceMatching: VoiceMatching;
  private apiKey: string;
  private isProcessing: boolean = false;
  
  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
    this.voiceMatching = createVoiceMatching(apiKey);
    this.loadProfiles();
    this.initializeVoiceMatching();
  }
  
  /**
   * Initialize voice matching system
   */
  private async initializeVoiceMatching(): Promise<void> {
    try {
      await this.voiceMatching.initialize();
      console.log('[NarratorVoiceCloning] Voice matching system initialized');
    } catch (error) {
      console.error('[NarratorVoiceCloning] Failed to initialize voice matching:', error);
    }
  }
  
  /**
   * Set the TTS service to use matched voices
   */
  setTTSService(ttsService: TTSService): void {
    this.ttsService = ttsService;
  }
  
  /**
   * Match narrator voice from YouTube audio (replaces cloning)
   */
  async cloneNarratorFromYouTube(
    bookId: string,
    bookTitle: string,
    youtubePlayer: any,
    sampleStartTime: number = 30,
    sampleDuration: number = 30
  ): Promise<NarratorVoiceProfile> {
    // Check if already matched
    const existing = this.profiles.get(bookId);
    if (existing?.isMatched) {
      console.log('[NarratorVoiceCloning] Using existing voice match:', existing.voiceName);
      return existing;
    }
    
    if (this.isProcessing) {
      throw new Error('Already processing a voice match request');
    }
    
    this.isProcessing = true;
    
    try {
      console.log('[NarratorVoiceCloning] Matching narrator voice for:', bookTitle);
      
      // Extract YouTube video ID from player or URL
      const youtubeVideoId = this.extractVideoId(youtubePlayer);
      
      // Use voice matching to find best ElevenLabs voice
      const voiceMatch = await this.voiceMatching.matchNarratorVoice(
        bookId,
        bookTitle,
        youtubeVideoId,
        youtubePlayer,
        sampleDuration
      );
      
      // Create profile from voice match
      const profile: NarratorVoiceProfile = {
        bookId,
        bookTitle,
        voiceId: voiceMatch.matchedVoice.voice_id,
        originalVoiceId: 'EXAVITQu4vr4xnSDxMaL', // Default fallback
        isMatched: true,
        modelId: 'eleven_turbo_v2',
        settings: {
          stability: 0.6,  // Slightly more stable for narrator consistency
          similarityBoost: 0.8, // High similarity for voice matching
          style: 0.2,      // Lower style variation for consistency
          useSpeakerBoost: true
        },
        createdAt: Date.now(),
        matchConfidence: voiceMatch.matchConfidence,
        voiceName: voiceMatch.matchedVoice.name
      };
      
      // Store and save profile
      this.profiles.set(bookId, profile);
      this.saveProfiles();
      
      // Update TTS service to use matched voice
      if (this.ttsService) {
        await this.updateTTSVoice(profile);
      }
      
      const confidencePercent = Math.round(profile.matchConfidence! * 100);
      console.log(`[NarratorVoiceCloning] Voice matched successfully: ${profile.voiceName} (${confidencePercent}% match)`);
      this.emit('voiceMatched', profile);
      
      return profile;
      
    } catch (error) {
      console.error('[NarratorVoiceCloning] Failed to match voice:', error);
      
      // Return fallback profile
      return this.createFallbackProfile(bookId, bookTitle);
      
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Extract YouTube video ID from player or URL
   */
  private extractVideoId(youtubePlayer: any): string {
    if (youtubePlayer && typeof youtubePlayer.getVideoData === 'function') {
      const videoData = youtubePlayer.getVideoData();
      if (videoData && videoData.video_id) {
        return videoData.video_id;
      }
    }
    
    // If we can't get it from player, try to extract from current URL
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    if (videoId) {
      return videoId;
    }
    
    // Fallback - return empty string, will be handled by voice matching
    return '';
  }
  
  /**
   * Update TTS service to use matched voice
   */
  private async updateTTSVoice(profile: NarratorVoiceProfile): Promise<void> {
    if (!this.ttsService) return;
    
    // Create new config with matched voice
    const newConfig: TTSConfig = {
      apiKey: this.apiKey,
      voiceId: profile.voiceId,
      model: profile.modelId as any,
      stability: profile.settings.stability,
      similarityBoost: profile.settings.similarityBoost,
      style: profile.settings.style,
      useSpeakerBoost: profile.settings.useSpeakerBoost
    };
    
    // Reinitialize TTS with new voice
    const newTTS = new TTSService(newConfig);
    await newTTS.initialize();
    
    // Replace the service
    this.ttsService = newTTS;
    
    console.log(`[NarratorVoiceCloning] TTS updated with matched voice: ${profile.voiceName}`);
  }
  
  /**
   * Get or create voice profile for a book
   */
  async getVoiceProfile(bookId: string): Promise<NarratorVoiceProfile | null> {
    const profile = this.profiles.get(bookId);
    if (profile) {
      return profile;
    }
    
    // Check if voice matching has a match for this book
    const voiceMatch = this.voiceMatching.getVoiceMatch(bookId);
    if (voiceMatch) {
      // Create profile from existing match
      const profile: NarratorVoiceProfile = {
        bookId,
        bookTitle: voiceMatch.bookTitle,
        voiceId: voiceMatch.matchedVoice.voice_id,
        isMatched: true,
        modelId: 'eleven_turbo_v2',
        settings: {
          stability: 0.6,
          similarityBoost: 0.8,
          style: 0.2,
          useSpeakerBoost: true
        },
        createdAt: voiceMatch.analysisTimestamp,
        matchConfidence: voiceMatch.matchConfidence,
        voiceName: voiceMatch.matchedVoice.name
      };
      
      this.profiles.set(bookId, profile);
      this.saveProfiles();
      return profile;
    }
    
    return null;
  }
  
  /**
   * Create fallback profile when matching fails
   */
  private createFallbackProfile(bookId: string, bookTitle: string): NarratorVoiceProfile {
    const profile: NarratorVoiceProfile = {
      bookId,
      bookTitle,
      voiceId: 'EXAVITQu4vr4xnSDxMaL', // Paul voice as fallback
      isMatched: false,
      modelId: 'eleven_turbo_v2',
      settings: {
        stability: 0.6,
        similarityBoost: 0.75,
        style: 0.2,
        useSpeakerBoost: true
      },
      createdAt: Date.now(),
      matchConfidence: 0.5, // Low confidence for fallback
      voiceName: 'Paul'
    };
    
    this.profiles.set(bookId, profile);
    this.saveProfiles();
    
    console.log('[NarratorVoiceCloning] Using fallback voice profile:', profile.voiceName);
    return profile;
  }
  
  /**
   * Get all available voices for manual selection
   */
  async getAvailableVoices(): Promise<any[]> {
    await this.voiceMatching.initialize();
    return this.voiceMatching.getAvailableVoices();
  }
  
  /**
   * Manually override voice selection
   */
  async overrideVoiceSelection(bookId: string, voiceId: string): Promise<boolean> {
    try {
      const voiceMatch = this.voiceMatching.setVoiceMatch(bookId, voiceId);
      if (voiceMatch) {
        // Update profile
        const profile = this.profiles.get(bookId);
        if (profile) {
          profile.voiceId = voiceId;
          profile.voiceName = voiceMatch.matchedVoice.name;
          profile.matchConfidence = 1.0; // Manual selection = perfect match
          
          // Update TTS if active
          if (this.ttsService) {
            await this.updateTTSVoice(profile);
          }
          
          this.saveProfiles();
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('[NarratorVoiceCloning] Failed to override voice:', error);
      return false;
    }
  }
  
  /**
   * Get voice matching statistics
   */
  getMatchingStats(): {
    totalProfiles: number;
    matchedProfiles: number;
    averageConfidence: number;
  } {
    const profiles = Array.from(this.profiles.values());
    const matched = profiles.filter(p => p.isMatched);
    const totalConfidence = matched.reduce((sum, p) => sum + (p.matchConfidence || 0), 0);
    
    return {
      totalProfiles: profiles.length,
      matchedProfiles: matched.length,
      averageConfidence: matched.length > 0 ? totalConfidence / matched.length : 0
    };
  }
  
  /**
   * Load profiles from localStorage
   */
  private loadProfiles(): void {
    try {
      const stored = localStorage.getItem('narrator_voice_profiles');
      if (stored) {
        const profiles = JSON.parse(stored);
        Object.entries(profiles).forEach(([bookId, profile]) => {
          this.profiles.set(bookId, profile as NarratorVoiceProfile);
        });
        console.log('[NarratorVoiceCloning] Loaded', this.profiles.size, 'voice profiles');
      }
    } catch (error) {
      console.error('[NarratorVoiceCloning] Failed to load profiles:', error);
    }
  }
  
  /**
   * Save profiles to localStorage
   */
  private saveProfiles(): void {
    try {
      const profiles: Record<string, NarratorVoiceProfile> = {};
      this.profiles.forEach((profile, bookId) => {
        profiles[bookId] = profile;
      });
      localStorage.setItem('narrator_voice_profiles', JSON.stringify(profiles));
    } catch (error) {
      console.error('[NarratorVoiceCloning] Failed to save profiles:', error);
    }
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    this.removeAllListeners();
    this.profiles.clear();
    this.voiceMatching?.destroy();
  }
}