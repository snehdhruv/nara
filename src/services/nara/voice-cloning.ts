/**
 * ElevenLabs Voice Cloning Service for Narrator Voices
 * This enables the audiobook narrator's voice to respond to user questions
 */

import { EventEmitter } from 'events';

interface VoiceProfile {
  voiceId: string;
  name: string;
  bookId: string;
  modelId: string;
  settings: {
    stability: number;
    similarityBoost: number;
    style?: number;
    useSpeakerBoost?: boolean;
  };
  createdAt: number;
  audioSampleUrl?: string;
}

interface CloneVoiceOptions {
  bookId: string;
  bookTitle: string;
  audioSampleBuffer: ArrayBuffer;
  sampleDuration: number;
}

export class NarratorVoiceCloning extends EventEmitter {
  private apiKey: string;
  private voiceProfiles: Map<string, VoiceProfile> = new Map();
  private activeVoiceId: string | null = null;
  private websocket: WebSocket | null = null;
  private audioContext: AudioContext;
  private isProcessingAudio: boolean = false;
  
  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.loadCachedProfiles();
  }
  
  /**
   * Extract audio sample from YouTube player for voice cloning
   */
  async extractNarratorSample(
    youtubePlayer: any,
    startTime: number = 10,
    duration: number = 30
  ): Promise<ArrayBuffer> {
    console.log('[VoiceCloning] Extracting narrator sample from YouTube...');
    
    // Seek to start position
    youtubePlayer.seekTo(startTime, true);
    youtubePlayer.playVideo();
    
    // Record audio using MediaRecorder API
    const audioStream = await this.captureYouTubeAudio();
    const mediaRecorder = new MediaRecorder(audioStream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    const chunks: Blob[] = [];
    
    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const arrayBuffer = await blob.arrayBuffer();
        
        // Stop playback
        youtubePlayer.pauseVideo();
        
        console.log('[VoiceCloning] Sample extracted:', arrayBuffer.byteLength, 'bytes');
        resolve(arrayBuffer);
      };
      
      mediaRecorder.onerror = reject;
      
      // Start recording
      mediaRecorder.start();
      
      // Stop after duration
      setTimeout(() => {
        mediaRecorder.stop();
      }, duration * 1000);
    });
  }
  
  /**
   * Capture audio from YouTube player
   */
  private async captureYouTubeAudio(): Promise<MediaStream> {
    // Get the YouTube iframe element
    const iframe = document.querySelector('iframe[src*="youtube.com"]') as HTMLIFrameElement;
    
    if (!iframe) {
      throw new Error('YouTube player not found');
    }
    
    // For YouTube, we need to use tab capture or desktop audio capture
    // This requires proper permissions
    try {
      // Try to get display media with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      } as any);
      
      return stream;
    } catch (error) {
      console.error('[VoiceCloning] Failed to capture audio:', error);
      
      // Fallback: Use microphone to record speaker output (lower quality)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      console.warn('[VoiceCloning] Using microphone fallback - quality may be reduced');
      return stream;
    }
  }
  
  /**
   * Clone narrator voice using ElevenLabs Instant Voice Cloning
   */
  async cloneNarratorVoice(options: CloneVoiceOptions): Promise<VoiceProfile> {
    console.log('[VoiceCloning] Starting voice cloning for:', options.bookTitle);
    
    // Check if we already have a profile for this book
    const existingProfile = this.voiceProfiles.get(options.bookId);
    if (existingProfile) {
      console.log('[VoiceCloning] Using existing voice profile:', existingProfile.voiceId);
      return existingProfile;
    }
    
    // Convert audio buffer to proper format for ElevenLabs
    const audioBlob = new Blob([options.audioSampleBuffer], { type: 'audio/mpeg' });
    const formData = new FormData();
    
    formData.append('name', `Narrator - ${options.bookTitle}`);
    formData.append('files', audioBlob, 'narrator_sample.mp3');
    formData.append('description', `Cloned narrator voice for audiobook: ${options.bookTitle}`);
    
    // Add voice to ElevenLabs using Instant Voice Cloning
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey
        },
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Voice cloning failed: ${error.detail?.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      // Create voice profile
      const profile: VoiceProfile = {
        voiceId: data.voice_id,
        name: `Narrator - ${options.bookTitle}`,
        bookId: options.bookId,
        modelId: 'eleven_turbo_v2', // Use turbo model for low latency
        settings: {
          stability: 0.5,
          similarityBoost: 0.85, // High similarity for accurate voice matching
          style: 0.3,
          useSpeakerBoost: true
        },
        createdAt: Date.now()
      };
      
      // Store profile
      this.voiceProfiles.set(options.bookId, profile);
      this.saveProfilesToCache();
      
      console.log('[VoiceCloning] Voice cloned successfully:', profile.voiceId);
      this.emit('voiceCloned', profile);
      
      return profile;
      
    } catch (error) {
      console.error('[VoiceCloning] Failed to clone voice:', error);
      
      // Fallback to a default narrator voice
      return this.getFallbackVoice(options.bookId);
    }
  }
  
  /**
   * Generate speech using cloned narrator voice
   */
  async generateNarratorSpeech(
    text: string,
    bookId: string,
    streamResponse: boolean = true
  ): Promise<ArrayBuffer | ReadableStream> {
    const profile = this.voiceProfiles.get(bookId);
    
    if (!profile) {
      throw new Error(`No voice profile found for book: ${bookId}`);
    }
    
    this.activeVoiceId = profile.voiceId;
    
    if (streamResponse) {
      // Use WebSocket streaming for real-time response
      return this.streamNarratorSpeech(text, profile);
    } else {
      // Use REST API for complete audio generation
      return this.generateCompleteAudio(text, profile);
    }
  }
  
  /**
   * Stream narrator speech using WebSocket for low latency
   */
  private async streamNarratorSpeech(
    text: string,
    profile: VoiceProfile
  ): Promise<ReadableStream> {
    return new ReadableStream({
      start: async (controller) => {
        // Initialize WebSocket connection to ElevenLabs
        const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${profile.voiceId}/stream-input?model_id=${profile.modelId}`;
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
          console.log('[VoiceCloning] WebSocket connected for streaming');
          
          // Send initial configuration
          this.websocket!.send(JSON.stringify({
            text: ' ', // Initial empty text to start stream
            voice_settings: profile.settings,
            xi_api_key: this.apiKey
          }));
          
          // Send the actual text in chunks for better streaming
          const chunks = this.chunkText(text, 100); // 100 char chunks
          chunks.forEach((chunk, index) => {
            setTimeout(() => {
              this.websocket!.send(JSON.stringify({
                text: chunk,
                try_trigger_generation: index === chunks.length - 1 // Trigger on last chunk
              }));
            }, index * 50); // Stagger chunk sending
          });
        };
        
        this.websocket.onmessage = (event) => {
          if (event.data instanceof Blob) {
            // Audio data received
            event.data.arrayBuffer().then(buffer => {
              controller.enqueue(new Uint8Array(buffer));
              this.emit('audioChunk', buffer);
            });
          } else {
            // Metadata or status message
            const message = JSON.parse(event.data);
            
            if (message.error) {
              console.error('[VoiceCloning] Stream error:', message.error);
              controller.error(new Error(message.error));
            }
            
            if (message.done) {
              console.log('[VoiceCloning] Stream complete');
              controller.close();
            }
          }
        };
        
        this.websocket.onerror = (error) => {
          console.error('[VoiceCloning] WebSocket error:', error);
          controller.error(error);
        };
        
        this.websocket.onclose = () => {
          console.log('[VoiceCloning] WebSocket closed');
          controller.close();
        };
      }
    });
  }
  
  /**
   * Generate complete audio using REST API
   */
  private async generateCompleteAudio(
    text: string,
    profile: VoiceProfile
  ): Promise<ArrayBuffer> {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${profile.voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text,
          model_id: profile.modelId,
          voice_settings: profile.settings
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`TTS generation failed: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log('[VoiceCloning] Generated audio:', arrayBuffer.byteLength, 'bytes');
    
    return arrayBuffer;
  }
  
  /**
   * Play audio buffer through Web Audio API
   */
  async playAudioBuffer(buffer: ArrayBuffer): Promise<void> {
    if (this.isProcessingAudio) {
      console.warn('[VoiceCloning] Already processing audio, skipping...');
      return;
    }
    
    this.isProcessingAudio = true;
    
    try {
      const audioBuffer = await this.audioContext.decodeAudioData(buffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => {
        this.isProcessingAudio = false;
        this.emit('playbackComplete');
      };
      
      source.start(0);
      this.emit('playbackStarted');
      
    } catch (error) {
      console.error('[VoiceCloning] Failed to play audio:', error);
      this.isProcessingAudio = false;
      throw error;
    }
  }
  
  /**
   * Get fallback voice when cloning fails
   */
  private getFallbackVoice(bookId: string): VoiceProfile {
    // Use a pre-selected high-quality narrator voice from ElevenLabs
    return {
      voiceId: 'EXAVITQu4vr4xnSDxMaL', // "Bella" - neutral narrator voice
      name: 'Default Narrator',
      bookId,
      modelId: 'eleven_turbo_v2',
      settings: {
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.3,
        useSpeakerBoost: true
      },
      createdAt: Date.now()
    };
  }
  
  /**
   * Chunk text for streaming
   */
  private chunkText(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = '';
    
    sentences.forEach(sentence => {
      if ((currentChunk + sentence).length > chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    });
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
  
  /**
   * Load cached voice profiles
   */
  private loadCachedProfiles(): void {
    try {
      const cached = localStorage.getItem('narrator_voice_profiles');
      if (cached) {
        const profiles = JSON.parse(cached);
        Object.entries(profiles).forEach(([bookId, profile]) => {
          this.voiceProfiles.set(bookId, profile as VoiceProfile);
        });
        console.log('[VoiceCloning] Loaded', this.voiceProfiles.size, 'cached voice profiles');
      }
    } catch (error) {
      console.error('[VoiceCloning] Failed to load cached profiles:', error);
    }
  }
  
  /**
   * Save voice profiles to cache
   */
  private saveProfilesToCache(): void {
    try {
      const profiles: Record<string, VoiceProfile> = {};
      this.voiceProfiles.forEach((profile, bookId) => {
        profiles[bookId] = profile;
      });
      localStorage.setItem('narrator_voice_profiles', JSON.stringify(profiles));
    } catch (error) {
      console.error('[VoiceCloning] Failed to save profiles to cache:', error);
    }
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.removeAllListeners();
  }
}