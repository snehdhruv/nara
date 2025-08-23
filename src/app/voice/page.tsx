'use client';

/**
 * Voice Audiobook Application - Zero to One
 * Full-screen voice interface with Spotify audiobook and real-time Q&A
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Script from 'next/script';
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";

// Extend Window interface for audio modules
declare global {
  interface Window {
    NaraAudioFactory?: {
      createAudioPipeline: (config: any) => Promise<any>;
    };
  }
}

interface AudioState {
  isInitialized: boolean;
  isPlaying: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  currentTime: number;
  duration: number;
  currentChapter: number;
  volume: number;
}

interface ConversationItem {
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  chapter?: number;
  citations?: Array<{ type: string; ref: string }>;
  playbackHint?: { chapter_idx: number; start_s: number };
}

interface AudiobookData {
  source: {
    video_id: string;
    title: string;
    duration_s: number;
  };
  chapters: Array<{
    idx: number;
    title: string;
    start_s: number;
    end_s: number;
  }>;
}

interface SpotifyPlaybackState {
  isPlaying: boolean;
  progressMs: number;
  lastUpdated: number;
  track?: {
    id: string;
    name: string;
    artist: string;
    album: string;
    durationMs: number;
    imageUrl?: string;
  };
  device?: {
    id: string;
    name: string;
    type: string;
    volumePercent: number;
  };
}

export default function VoiceApp() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">🎤 Zero to One - Voice Experience</h1>

        <SignedOut>
          <div className="max-w-md mx-auto text-center space-y-4">
            <p className="text-lg">Connect your Spotify account to start the voice audiobook experience</p>
            <a
              href="/api/auth/signin/spotify"
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              🎵 Connect Spotify
            </a>
          </div>
        </SignedOut>

        <SignedIn>
          <VoiceAppContent />
        </SignedIn>
      </div>
    </div>
  );
}

function VoiceAppContent() {
  // Spotify integration
  const playbackState = useQuery(api.spotify.getUserPlaybackState);
  const getCurrentPlayback = useAction(api.spotify.getCurrentPlayback);
  const spotifyAccessTokenAction = useAction(api.spotify.getSpotifyAccessToken);
  const controlSpotifyPlayback = useAction(api.spotify.controlSpotifyPlayback);

  // Audio state management
  const [audioState, setAudioState] = useState<AudioState>({
    isInitialized: false,
    isPlaying: false,
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    currentTime: 0,
    duration: 0,
    currentChapter: 1,
    volume: 0.8
  });

  // Conversation history
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [audiobook, setAudiobook] = useState<AudiobookData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScriptsLoaded, setIsScriptsLoaded] = useState(false);

  // Audio references
  const audioManagerRef = useRef<any>(null);
  const spotifyControlRef = useRef<any>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const playbackPollRef = useRef<NodeJS.Timeout | null>(null);

  // Load audiobook data for chapter mapping
  useEffect(() => {
    async function loadAudiobook() {
      try {
        const response = await fetch('/data/zero-to-one.json');
        const data = await response.json();
        setAudiobook(data);
      } catch (error) {
        console.error('Failed to load audiobook data:', error);
        setError('Failed to load audiobook data');
      }
    }
    loadAudiobook();
  }, []);

  // Poll Spotify playback for real-time updates
  useEffect(() => {
    const pollPlayback = async () => {
      try {
        await getCurrentPlayback();
      } catch (error) {
        console.error("Error polling Spotify playback:", error);
      }
    };

    // Initial fetch
    pollPlayback();

    // Set up polling interval
    playbackPollRef.current = setInterval(pollPlayback, 1000);

    return () => {
      if (playbackPollRef.current) {
        clearInterval(playbackPollRef.current);
      }
    };
  }, [getCurrentPlayback]);

  // Get current chapter based on time position
  const getCurrentChapterFromTime = useCallback((timeSeconds: number): number => {
    if (!audiobook) return 1;

    const chapter = audiobook.chapters.find(ch =>
      timeSeconds >= ch.start_s && timeSeconds < ch.end_s
    );
    return chapter?.idx || 1;
  }, [audiobook]);

  // Update audio state when Spotify playback changes
  useEffect(() => {
    if (playbackState) {
      const progressMs = playbackState.progressMs || 0;
      setAudioState(prev => ({
        ...prev,
        isPlaying: playbackState.isPlaying,
        currentTime: Math.floor(progressMs / 1000),
        duration: playbackState.track ? Math.floor(playbackState.track.durationMs / 1000) : 0,
        currentChapter: getCurrentChapterFromTime(Math.floor(progressMs / 1000))
      }));
    }
  }, [playbackState, audiobook, getCurrentChapterFromTime]);

  // Spotify Control Functions
  const pauseSpotify = async () => {
    try {
      await controlSpotifyPlayback({ action: "pause" });
      console.log('[VoiceApp] Spotify paused for voice interaction');
    } catch (error) {
      console.error('[VoiceApp] Failed to pause Spotify:', error);
      setError(`Failed to pause audiobook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const resumeSpotify = async () => {
    try {
      await controlSpotifyPlayback({ action: "play" });
      console.log('[VoiceApp] Spotify resumed after voice interaction');
    } catch (error) {
      console.error('[VoiceApp] Failed to resume Spotify:', error);
      setError(`Failed to resume audiobook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Initialize audio system when scripts are loaded
  const initializeAudioSystem = useCallback(async () => {
    if (!isScriptsLoaded || audioState.isInitialized) return;

    try {
      console.log('[VoiceApp] Initializing audio system...');

      // Check if required classes are available
      if (typeof window.NaraAudioFactory === 'undefined') {
        throw new Error('Nara Audio modules not loaded');
      }

      // Create audio pipeline with optimized configuration
      const audioManager = await window.NaraAudioFactory.createAudioPipeline({
        vapiApiKey: '765f8644-1464-4b36-a4fe-c660e15ba313', // From .env
        vapiAssistantId: '73c59df7-34d0-4e5a-89b0-d0668982c8cc', // Nara Agent from config
        ttsApiKey: 'sk_536c3f9ad29e9e6e4f0b4aee762afa6d8db7d750d7f64587', // From .env
        ttsVoiceId: 'pNInz6obpgDQGcFmaJgB', // Adam voice ID
        // Optimized for low-latency voice interaction
        vapi: {
          audioQuality: {
            sampleRate: 24000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        },
        tts: {
          model: 'eleven_turbo_v2',
          optimizeStreamingLatency: 3,
          stability: 0.75,
          similarityBoost: 0.8
        }
      });

      audioManagerRef.current = audioManager;

      // Set up event listeners
      setupAudioEventListeners(audioManager);

      setAudioState(prev => ({ ...prev, isInitialized: true }));
      console.log('[VoiceApp] Audio system initialized successfully');

    } catch (error) {
      console.error('[VoiceApp] Audio initialization failed:', error);
      setError(`Audio initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [isScriptsLoaded, audioState.isInitialized]);

  // Set up audio event listeners with Spotify barge-in state machine
  const setupAudioEventListeners = useCallback((audioManager: any) => {
    // BARGE-IN STATE MACHINE: Voice detected → Pause Spotify → Process → TTS → Resume

    // 1. Voice Activity Detected - Immediate Spotify pause
    audioManager.addEventListener('conversationStarted', async () => {
      console.log('[VoiceApp] 🎤 Voice detected - Starting barge-in sequence');
      setAudioState(prev => ({ ...prev, isListening: true }));
      await pauseSpotify(); // Immediate pause for responsive UX
    });

    // 2. User Speech Transcribed - Process the question
    audioManager.addEventListener('userMessage', (event: CustomEvent) => {
      const transcript = event.detail;
      console.log(`[VoiceApp] 👤 User said: "${transcript}"`);

      addConversationItem({
        type: 'user',
        content: transcript,
        timestamp: Date.now(),
        chapter: audioState.currentChapter
      });

      processVoiceQuestion(transcript);
    });

    // 3. AI Response Ready - Start TTS playback
    audioManager.addEventListener('assistantMessage', (event: CustomEvent) => {
      const response = event.detail;
      console.log(`[VoiceApp] 🤖 AI responding: "${response.substring(0, 50)}..."`);
      setAudioState(prev => ({ ...prev, isSpeaking: true }));
    });

    // 4. TTS Complete - Resume Spotify audiobook
    audioManager.addEventListener('conversationStopped', async () => {
      console.log('[VoiceApp] ✅ Voice interaction complete - Resuming audiobook');
      setAudioState(prev => ({
        ...prev,
        isListening: false,
        isSpeaking: false,
        isProcessing: false
      }));

      // Small delay to ensure clean transition
      setTimeout(async () => {
        await resumeSpotify();
      }, 500);
    });

    // Error handling - Always try to resume Spotify on error
    audioManager.addEventListener('error', async (event: CustomEvent) => {
      console.error('[VoiceApp] Audio manager error:', event.detail);
      setError(`Audio error: ${event.detail.message || event.detail}`);

      // Reset state and try to resume audiobook
      setAudioState(prev => ({
        ...prev,
        isListening: false,
        isSpeaking: false,
        isProcessing: false
      }));

      try {
        await resumeSpotify();
      } catch (resumeError) {
        console.error('[VoiceApp] Failed to resume after error:', resumeError);
      }
    });
  }, [audioState.currentChapter]);

  // Process voice question through QA system
  const processVoiceQuestion = async (question: string) => {
    setAudioState(prev => ({ ...prev, isProcessing: true }));

    try {
      const response = await fetch('/api/voice-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask-question',
          question,
          context: {
            currentChapter: audioState.currentChapter,
            currentTime: audioState.currentTime
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: ConversationItem = {
          type: 'assistant',
          content: data.result.answer,
          timestamp: Date.now(),
          chapter: audioState.currentChapter,
          citations: data.result.citations,
          playbackHint: data.result.playbackHint
        };

        addConversationItem(assistantMessage);

        // Speak the response using TTS
        if (audioManagerRef.current) {
          await audioManagerRef.current.speak(data.result.answer);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('[VoiceApp] Question processing failed:', error);
      setError(`Question processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAudioState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  // Add conversation item and scroll to bottom
  const addConversationItem = useCallback((item: ConversationItem) => {
    setConversation(prev => [...prev, item]);
    setTimeout(() => {
      conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Manual Spotify controls (for testing when no voice interaction)
  const manualPauseSpotify = async () => {
    await pauseSpotify();
  };

  const manualResumeSpotify = async () => {
    await resumeSpotify();
  };

  const jumpToChapter = async (chapterIdx: number) => {
    const chapter = audiobook?.chapters.find(ch => ch.idx === chapterIdx);
    if (chapter) {
      try {
        await controlSpotifyPlayback({
          action: "play",
          positionMs: chapter.start_s * 1000
        });
        console.log(`[VoiceApp] Jumped to Chapter ${chapterIdx}`);
      } catch (error) {
        console.error('[VoiceApp] Failed to jump to chapter:', error);
        setError(`Failed to jump to chapter: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  // Voice interaction controls
  const startListening = async () => {
    if (!audioManagerRef.current || audioState.isListening) return;

    try {
      await audioManagerRef.current.startListening();
    } catch (error) {
      console.error('[VoiceApp] Failed to start listening:', error);
      setError(`Failed to start listening: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const stopListening = () => {
    if (audioManagerRef.current && audioState.isListening) {
      audioManagerRef.current.stopListening();
    }
  };

  // Format time display (handles both seconds and milliseconds)
  const formatTime = (timeValue: number): string => {
    // Convert milliseconds to seconds if the value is too large
    const seconds = timeValue > 10000 ? Math.floor(timeValue / 1000) : timeValue;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Get current chapter info
  const currentChapterInfo = audiobook?.chapters.find(ch => ch.idx === audioState.currentChapter);

  // Initialize audio system when scripts load
  useEffect(() => {
    if (isScriptsLoaded) {
      initializeAudioSystem();
    }
  }, [isScriptsLoaded, initializeAudioSystem]);

  return (
    <>
      {/* Load required scripts */}
      <Script
        src="https://www.youtube.com/iframe_api"
        strategy="lazyOnload"
        onLoad={() => console.log('[VoiceApp] YouTube API loaded')}
      />
      <Script
        src="/main/audio/BrowserVapiService.js"
        strategy="lazyOnload"
        onLoad={() => console.log('[VoiceApp] BrowserVapiService loaded')}
      />
      <Script
        src="/main/audio/BrowserTTSService.js"
        strategy="lazyOnload"
        onLoad={() => console.log('[VoiceApp] BrowserTTSService loaded')}
      />
      <Script
        src="/main/audio/BrowserAudioPlayer.js"
        strategy="lazyOnload"
        onLoad={() => console.log('[VoiceApp] BrowserAudioPlayer loaded')}
      />
      <Script
        src="/main/audio/BrowserAudioManager.js"
        strategy="lazyOnload"
        onLoad={() => console.log('[VoiceApp] BrowserAudioManager loaded')}
      />
      <Script
        src="/main/audio/browser-audio-modules.js"
        strategy="lazyOnload"
        onLoad={() => {
          console.log('[VoiceApp] All audio modules loaded');
          setIsScriptsLoaded(true);
        }}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col">

        {/* Header */}
        <header className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                🎤 Zero to One - Voice Experience
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {playbackState?.track
                  ? `${playbackState.track.name} • ${playbackState.track.artist}`
                  : 'No audiobook or podcast detected - please play an audiobook or podcast on Spotify'
                }
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* System Status */}
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${audioState.isInitialized ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-slate-300">Voice {audioState.isInitialized ? 'Ready' : 'Loading'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${playbackState?.isPlaying ? 'bg-green-400' : 'bg-yellow-400'}`} />
                <span className="text-slate-300">Spotify {playbackState?.isPlaying ? 'Playing' : 'Paused'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex">

          {/* Left Panel - Spotify Player & Controls */}
          <div className="w-1/3 p-6 border-r border-white/10">

            {/* Spotify Playback Info */}
            {playbackState?.track ? (
              <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  {playbackState.track.imageUrl && (
                    <img
                      src={playbackState.track.imageUrl}
                      alt={playbackState.track.album}
                      className="w-12 h-12 rounded"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-green-400">{playbackState.track.name}</h3>
                    <p className="text-sm text-slate-300">{playbackState.track.artist}</p>
                    <p className="text-xs text-slate-400">{playbackState.track.album}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-1000"
                      style={{
                        width: `${playbackState.track.durationMs > 0 ? ((playbackState.progressMs || 0) / playbackState.track.durationMs) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{formatTime(playbackState.progressMs || 0)}</span>
                    <span>{formatTime(playbackState.track.durationMs)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-yellow-900/20 rounded-lg border border-yellow-500/20">
                <div className="text-center">
                  <h3 className="font-semibold text-yellow-400 mb-2">🎧 No Audiobook/Podcast Detected</h3>
                  <p className="text-sm text-slate-300 mb-3">
                    Please start playing an audiobook or podcast episode on Spotify to use voice features.
                  </p>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>✅ Supported: Audiobooks, Podcast episodes, Audio shows</p>
                    <p>❌ Not supported: Music, Songs, Regular albums</p>
                  </div>
                </div>
              </div>
            )}            {/* Chapter Information */}
            {currentChapterInfo && (
              <div className="mb-6 p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                <h3 className="font-semibold text-blue-400 mb-2">
                  Chapter {currentChapterInfo.idx}
                </h3>
                <p className="text-sm text-slate-300 mb-2">
                  {currentChapterInfo.title}
                </p>
                <div className="text-xs text-slate-400">
                  {formatTime(currentChapterInfo.start_s)} - {formatTime(currentChapterInfo.end_s)}
                </div>
              </div>
            )}

            {/* Voice Control */}
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-500/20">
              <h3 className="font-semibold mb-3 text-center">🎤 Voice Control</h3>

              <div className="flex flex-col gap-3">
                <button
                  onClick={startListening}
                  disabled={!audioState.isInitialized || audioState.isListening || audioState.isProcessing}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                >
                  {audioState.isListening
                    ? '🎤 Listening...'
                    : audioState.isProcessing
                    ? '⏳ Processing...'
                    : '🎤 Ask a Question'
                  }
                </button>

                {/* Voice Status Indicators */}
                <div className="flex justify-center gap-4 text-sm">
                  <div className={`flex items-center gap-2 ${audioState.isListening ? 'text-green-400' : 'text-slate-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${audioState.isListening ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
                    Voice
                  </div>
                  <div className={`flex items-center gap-2 ${audioState.isProcessing ? 'text-yellow-400' : 'text-slate-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${audioState.isProcessing ? 'bg-yellow-400 animate-pulse' : 'bg-slate-500'}`} />
                    AI
                  </div>
                  <div className={`flex items-center gap-2 ${audioState.isSpeaking ? 'text-blue-400' : 'text-slate-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${audioState.isSpeaking ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'}`} />
                    TTS
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-xs text-slate-400 p-3 bg-white/5 rounded border border-white/10">
              <p className="mb-2">🎧 <strong>Test Instructions:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• Start playing Zero to One audiobook on Spotify</li>
                <li>• Click 🎤 to activate voice detection</li>
                <li>• Speak your question - Spotify will pause automatically</li>
                <li>• AI will respond with voice, then Spotify resumes</li>
              </ul>
              <div className="mt-2 text-yellow-400">
                <strong>✅ Pass condition:</strong> Voice barge-in → pause → LLM response → resume
              </div>
            </div>
          </div>

          {/* Right Panel - Conversation */}
          <div className="flex-1 p-6 flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-center">💬 Conversation History</h2>

            {/* Conversation Area */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
              {conversation.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  <p className="mb-2">🤔 No questions yet</p>
                  <p className="text-sm">Start listening to the audiobook and ask questions using your voice!</p>
                </div>
              ) : (
                <>
                  {conversation.map((item, index) => (
                    <div key={index} className={`flex ${item.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg ${
                        item.type === 'user'
                          ? 'bg-blue-600 text-white ml-auto'
                          : 'bg-white/10 text-slate-100'
                      }`}>
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-sm">
                            {item.type === 'user' ? '👤' : '🤖'}
                          </span>
                          <div className="flex-1">
                            <div className="text-xs text-slate-300 mb-1">
                              Chapter {item.chapter} • {new Date(item.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <p className="whitespace-pre-wrap">{item.content}</p>

                        {/* Citations for assistant responses */}
                        {item.type === 'assistant' && item.citations && item.citations.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/20">
                            <div className="text-xs text-slate-300 mb-1">📚 Sources:</div>
                            {item.citations.map((citation, idx) => (
                              <div key={idx} className="text-xs text-slate-400">
                                [{citation.type}] {citation.ref}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Playback hint */}
                        {item.type === 'assistant' && item.playbackHint && (
                          <div className="mt-2 pt-2 border-t border-white/20">
                            <button
                              onClick={() => jumpToChapter(item.playbackHint!.chapter_idx)}
                              className="text-xs bg-purple-600/50 hover:bg-purple-600 px-2 py-1 rounded transition-colors"
                            >
                              💡 Jump to Chapter {item.playbackHint.chapter_idx} ({formatTime(item.playbackHint.start_s)})
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={conversationEndRef} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg max-w-md">
            <div className="flex items-start gap-2">
              <span>⚠️</span>
              <div>
                <div className="font-semibold">Error</div>
                <div className="text-sm">{error}</div>
                <button
                  onClick={() => setError(null)}
                  className="text-xs bg-red-700 hover:bg-red-800 px-2 py-1 rounded mt-2 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}