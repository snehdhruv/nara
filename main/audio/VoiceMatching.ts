/**
 * Voice Matching System - Matches YouTube narrators to closest ElevenLabs voices
 * Maintains narrator consistency without voice cloning limitations
 */

import { EventEmitter } from 'events';

export interface VoiceCharacteristics {
  gender: 'male' | 'female' | 'neutral';
  age: 'young' | 'adult' | 'elderly';
  accent: string;
  pitch: 'low' | 'medium' | 'high';
  tone: 'warm' | 'professional' | 'friendly' | 'authoritative';
  pace: 'slow' | 'medium' | 'fast';
  resonance: 'deep' | 'medium' | 'light';
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: {
    accent?: string;
    description?: string;
    age?: string;
    gender?: string;
    use_case?: string;
  };
  characteristics: VoiceCharacteristics;
  matchScore?: number;
}

export interface NarratorVoiceMatch {
  bookId: string;
  bookTitle: string;
  youtubeVideoId: string;
  analyzedCharacteristics: VoiceCharacteristics;
  matchedVoice: ElevenLabsVoice;
  matchConfidence: number;
  analysisTimestamp: number;
  audioSampleUrl?: string;
}

export class VoiceMatching extends EventEmitter {
  private voiceMatches: Map<string, NarratorVoiceMatch> = new Map();
  private elevenlabsVoices: ElevenLabsVoice[] = [];
  private apiKey: string;
  private isInitialized: boolean = false;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
    this.loadStoredMatches();
  }

  /**
   * Initialize by fetching ElevenLabs voice library
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('[VoiceMatching] Fetching ElevenLabs voice library...');
      
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Process and characterize each voice
      this.elevenlabsVoices = data.voices.map((voice: any) => this.characterizeElevenLabsVoice(voice));
      
      console.log(`[VoiceMatching] Loaded ${this.elevenlabsVoices.length} ElevenLabs voices`);
      
      this.isInitialized = true;
      this.emit('initialized', this.elevenlabsVoices.length);

    } catch (error) {
      console.error('[VoiceMatching] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Analyze YouTube video audio and match to best ElevenLabs voice
   */
  async matchNarratorVoice(
    bookId: string,
    bookTitle: string,
    youtubeVideoId: string,
    youtubePlayer?: any,
    sampleDuration: number = 30
  ): Promise<NarratorVoiceMatch> {
    // Check if already matched
    const existing = this.voiceMatches.get(bookId);
    if (existing) {
      console.log('[VoiceMatching] Using existing match:', existing.matchedVoice.name);
      return existing;
    }

    await this.initialize();

    console.log(`[VoiceMatching] Analyzing narrator voice for: ${bookTitle}`);

    try {
      // Analyze YouTube audio characteristics
      const characteristics = await this.analyzeYouTubeAudio(youtubeVideoId, youtubePlayer, sampleDuration);
      
      // Find best matching ElevenLabs voice
      const matchedVoice = this.findBestVoiceMatch(characteristics);
      
      // Calculate confidence score
      const matchConfidence = this.calculateMatchConfidence(characteristics, matchedVoice.characteristics);

      // Create voice match
      const voiceMatch: NarratorVoiceMatch = {
        bookId,
        bookTitle,
        youtubeVideoId,
        analyzedCharacteristics: characteristics,
        matchedVoice,
        matchConfidence,
        analysisTimestamp: Date.now(),
        audioSampleUrl: `https://www.youtube.com/watch?v=${youtubeVideoId}&t=30`
      };

      // Store the match
      this.voiceMatches.set(bookId, voiceMatch);
      this.saveMatches();

      console.log(`[VoiceMatching] Matched ${bookTitle} to ${matchedVoice.name} (${Math.round(matchConfidence * 100)}% confidence)`);
      
      this.emit('voiceMatched', voiceMatch);
      return voiceMatch;

    } catch (error) {
      console.error('[VoiceMatching] Analysis failed, using fallback match:', error);
      return this.createFallbackMatch(bookId, bookTitle, youtubeVideoId);
    }
  }

  /**
   * Analyze YouTube audio to extract voice characteristics
   */
  private async analyzeYouTubeAudio(
    youtubeVideoId: string,
    youtubePlayer?: any,
    sampleDuration: number = 30
  ): Promise<VoiceCharacteristics> {
    // For now, use heuristics based on video content and metadata
    // In a full implementation, this would use audio analysis APIs like:
    // - Azure Cognitive Services Speech
    // - Google Cloud Speech-to-Text with voice analytics
    // - AssemblyAI with audio intelligence
    
    console.log(`[VoiceMatching] Analyzing audio characteristics for ${youtubeVideoId}...`);

    // Heuristic analysis based on video metadata and known patterns
    const characteristics = await this.heuristicVoiceAnalysis(youtubeVideoId, youtubePlayer);
    
    return characteristics;
  }

  /**
   * Heuristic voice analysis based on content patterns
   */
  private async heuristicVoiceAnalysis(
    youtubeVideoId: string,
    youtubePlayer?: any
  ): Promise<VoiceCharacteristics> {
    // Default characteristics that work well for audiobooks
    let characteristics: VoiceCharacteristics = {
      gender: 'male',
      age: 'adult',
      accent: 'american',
      pitch: 'medium',
      tone: 'professional',
      pace: 'medium',
      resonance: 'medium'
    };

    // Pattern matching based on known video IDs and content
    const videoPatterns: Record<string, Partial<VoiceCharacteristics>> = {
      'MxGn2MBVdJI': { // Naval Ravikant
        gender: 'male',
        age: 'adult', 
        accent: 'american',
        pitch: 'medium',
        tone: 'authoritative',
        pace: 'medium',
        resonance: 'medium'
      },
      'UF8uR6Z6KLc': { // Steve Jobs Stanford
        gender: 'male',
        age: 'adult',
        accent: 'american', 
        pitch: 'medium',
        tone: 'authoritative',
        pace: 'medium',
        resonance: 'medium'
      },
      'Th8JoIan4dg': { // Y Combinator / Paul Graham
        gender: 'male',
        age: 'adult',
        accent: 'american',
        pitch: 'medium', 
        tone: 'friendly',
        pace: 'medium',
        resonance: 'medium'
      }
    };

    const pattern = videoPatterns[youtubeVideoId];
    if (pattern) {
      characteristics = { ...characteristics, ...pattern };
      console.log(`[VoiceMatching] Applied known pattern for ${youtubeVideoId}`);
    }

    return characteristics;
  }

  /**
   * Characterize an ElevenLabs voice based on its metadata
   */
  private characterizeElevenLabsVoice(voice: any): ElevenLabsVoice {
    const labels = voice.labels || {};
    
    // Extract characteristics from voice metadata
    const characteristics: VoiceCharacteristics = {
      gender: this.parseGender(labels.gender, voice.category),
      age: this.parseAge(labels.age, labels.description),
      accent: this.parseAccent(labels.accent, labels.description),
      pitch: this.parsePitch(labels.description, voice.name),
      tone: this.parseTone(labels.description, labels.use_case),
      pace: this.parsePace(labels.description),
      resonance: this.parseResonance(labels.description)
    };

    return {
      voice_id: voice.voice_id,
      name: voice.name,
      category: voice.category,
      labels,
      characteristics
    };
  }

  /**
   * Find the best matching ElevenLabs voice for given characteristics
   */
  private findBestVoiceMatch(targetCharacteristics: VoiceCharacteristics): ElevenLabsVoice {
    let bestMatch = this.elevenlabsVoices[0];
    let bestScore = 0;

    for (const voice of this.elevenlabsVoices) {
      const score = this.calculateSimilarityScore(targetCharacteristics, voice.characteristics);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = voice;
      }
    }

    bestMatch.matchScore = bestScore;
    return bestMatch;
  }

  /**
   * Calculate similarity score between two voice characteristic sets
   */
  private calculateSimilarityScore(
    target: VoiceCharacteristics, 
    candidate: VoiceCharacteristics
  ): number {
    let score = 0;
    let totalWeight = 0;

    // Weighted scoring - gender and age are most important for narrator consistency
    const weights = {
      gender: 3.0,    // Most important - voice timbre
      age: 2.5,       // Very important - voice maturity
      accent: 2.0,    // Important - regional authenticity
      tone: 1.5,      // Moderately important - reading style
      pitch: 1.0,     // Less important - can be adjusted
      pace: 0.5,      // Least important - can be adjusted
      resonance: 1.0  // Moderate - affects warmth
    };

    // Calculate weighted similarity for each characteristic
    Object.entries(weights).forEach(([key, weight]) => {
      const targetValue = target[key as keyof VoiceCharacteristics];
      const candidateValue = candidate[key as keyof VoiceCharacteristics];
      
      if (targetValue === candidateValue) {
        score += weight;
      } else if (this.areCompatible(key, targetValue, candidateValue)) {
        score += weight * 0.5; // Half points for compatible values
      }
      
      totalWeight += weight;
    });

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * Check if two characteristic values are compatible
   */
  private areCompatible(characteristic: string, value1: string, value2: string): boolean {
    const compatibilityMap: Record<string, string[][]> = {
      age: [['young', 'adult'], ['adult', 'elderly']],
      pitch: [['low', 'medium'], ['medium', 'high']],
      tone: [['professional', 'authoritative'], ['warm', 'friendly']],
      accent: [['american', 'british'], ['neutral', 'american']]
    };

    const compatible = compatibilityMap[characteristic] || [];
    return compatible.some(pair => 
      (pair[0] === value1 && pair[1] === value2) ||
      (pair[0] === value2 && pair[1] === value1)
    );
  }

  /**
   * Calculate match confidence score
   */
  private calculateMatchConfidence(
    analyzed: VoiceCharacteristics,
    matched: VoiceCharacteristics
  ): number {
    return this.calculateSimilarityScore(analyzed, matched);
  }

  /**
   * Create fallback match for when analysis fails
   */
  private createFallbackMatch(
    bookId: string,
    bookTitle: string,
    youtubeVideoId: string
  ): NarratorVoiceMatch {
    // Use a high-quality default voice (Paul - good for audiobooks)
    const fallbackVoice = this.elevenlabsVoices.find(v => v.name === 'Paul') || this.elevenlabsVoices[0];
    
    const fallbackMatch: NarratorVoiceMatch = {
      bookId,
      bookTitle,
      youtubeVideoId,
      analyzedCharacteristics: {
        gender: 'male',
        age: 'adult',
        accent: 'american',
        pitch: 'medium',
        tone: 'professional',
        pace: 'medium',
        resonance: 'medium'
      },
      matchedVoice: fallbackVoice,
      matchConfidence: 0.6, // Reasonable confidence for fallback
      analysisTimestamp: Date.now()
    };

    this.voiceMatches.set(bookId, fallbackMatch);
    this.saveMatches();

    return fallbackMatch;
  }

  // Characteristic parsing helpers
  private parseGender(gender?: string, category?: string): 'male' | 'female' | 'neutral' {
    if (gender) return gender.toLowerCase() as any;
    if (category?.includes('male')) return 'male';
    if (category?.includes('female')) return 'female';
    return 'neutral';
  }

  private parseAge(age?: string, description?: string): 'young' | 'adult' | 'elderly' {
    if (age) return age.toLowerCase() as any;
    if (description?.toLowerCase().includes('young')) return 'young';
    if (description?.toLowerCase().includes('old') || description?.toLowerCase().includes('elderly')) return 'elderly';
    return 'adult';
  }

  private parseAccent(accent?: string, description?: string): string {
    if (accent) return accent.toLowerCase();
    if (description?.toLowerCase().includes('british')) return 'british';
    if (description?.toLowerCase().includes('american')) return 'american';
    return 'neutral';
  }

  private parsePitch(description?: string, name?: string): 'low' | 'medium' | 'high' {
    const desc = (description || '').toLowerCase();
    if (desc.includes('deep') || desc.includes('low')) return 'low';
    if (desc.includes('high') || desc.includes('light')) return 'high';
    return 'medium';
  }

  private parseTone(description?: string, useCase?: string): string {
    const desc = (description || '').toLowerCase();
    const use = (useCase || '').toLowerCase();
    
    if (desc.includes('warm') || use.includes('warm')) return 'warm';
    if (desc.includes('professional') || use.includes('professional')) return 'professional';
    if (desc.includes('friendly') || use.includes('conversational')) return 'friendly';
    if (desc.includes('authoritative') || use.includes('narration')) return 'authoritative';
    
    return 'professional';
  }

  private parsePace(description?: string): 'slow' | 'medium' | 'fast' {
    const desc = (description || '').toLowerCase();
    if (desc.includes('slow') || desc.includes('deliberate')) return 'slow';
    if (desc.includes('fast') || desc.includes('quick')) return 'fast';
    return 'medium';
  }

  private parseResonance(description?: string): 'deep' | 'medium' | 'light' {
    const desc = (description || '').toLowerCase();
    if (desc.includes('deep') || desc.includes('resonant')) return 'deep';
    if (desc.includes('light') || desc.includes('airy')) return 'light';
    return 'medium';
  }

  /**
   * Get existing voice match for a book
   */
  getVoiceMatch(bookId: string): NarratorVoiceMatch | null {
    return this.voiceMatches.get(bookId) || null;
  }

  /**
   * Get all available ElevenLabs voices
   */
  getAvailableVoices(): ElevenLabsVoice[] {
    return this.elevenlabsVoices;
  }

  /**
   * Manually set a voice match (for overrides)
   */
  setVoiceMatch(bookId: string, voiceId: string): NarratorVoiceMatch | null {
    const voice = this.elevenlabsVoices.find(v => v.voice_id === voiceId);
    if (!voice) return null;

    const existingMatch = this.voiceMatches.get(bookId);
    if (existingMatch) {
      existingMatch.matchedVoice = voice;
      existingMatch.matchConfidence = 1.0; // Manual selection = 100% confidence
      this.saveMatches();
      return existingMatch;
    }

    return null;
  }

  /**
   * Load stored matches from localStorage
   */
  private loadStoredMatches(): void {
    try {
      const stored = localStorage.getItem('narrator_voice_matches');
      if (stored) {
        const matches = JSON.parse(stored);
        Object.entries(matches).forEach(([bookId, match]) => {
          this.voiceMatches.set(bookId, match as NarratorVoiceMatch);
        });
        console.log(`[VoiceMatching] Loaded ${this.voiceMatches.size} stored voice matches`);
      }
    } catch (error) {
      console.error('[VoiceMatching] Failed to load stored matches:', error);
    }
  }

  /**
   * Save matches to localStorage
   */
  private saveMatches(): void {
    try {
      const matches: Record<string, NarratorVoiceMatch> = {};
      this.voiceMatches.forEach((match, bookId) => {
        matches[bookId] = match;
      });
      localStorage.setItem('narrator_voice_matches', JSON.stringify(matches));
    } catch (error) {
      console.error('[VoiceMatching] Failed to save matches:', error);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.removeAllListeners();
    this.voiceMatches.clear();
    this.elevenlabsVoices = [];
    this.isInitialized = false;
  }
}

// Factory function
export function createVoiceMatching(apiKey: string): VoiceMatching {
  return new VoiceMatching(apiKey);
}