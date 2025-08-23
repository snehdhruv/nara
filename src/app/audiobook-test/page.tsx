'use client';

/**
 * Zero to One Audiobook Test - YouTube Streaming with Voice Barge-in
 * Core test: Continuous audio → context-aware interruption → LLM response → resume
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Script from 'next/script';

interface YouTubePlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
  getPlayerState: () => number;
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

interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  currentTime: number;
  currentChapter: number;
  audioPlaying: boolean;
}

interface ConversationItem {
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  audioPosition: number;
  chapter: number;
  citations?: Array<{ type: string; ref: string }>;
}

export default function AudiobookTest() {
  // Core state
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    currentTime: 0,
    currentChapter: 1,
    audioPlaying: false,
  });
  
  const [audiobook, setAudiobook] = useState<AudiobookData | null>(null);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isYouTubeReady, setIsYouTubeReady] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);

  // Refs
  const playerRef = useRef<YouTubePlayer | null>(null);
  const audioManagerRef = useRef<any>(null);
  const timeUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // YouTube Player States
  const PLAYER_STATES = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5
  };

  // Load Zero to One audiobook data
  useEffect(() => {
    async function loadAudiobook() {
      try {
        const response = await fetch('/data/zero-to-one.json');
        const data = await response.json();
        setAudiobook(data);
        console.log('[AudiobookTest] Loaded audiobook data:', data.source.title);
      } catch (error) {
        console.error('[AudiobookTest] Failed to load audiobook data:', error);
        setError('Failed to load audiobook data');
      }
    }
    loadAudiobook();
  }, []);

  // Initialize YouTube player when API is ready
  useEffect(() => {
    if (isYouTubeReady && audiobook) {
      initializeYouTubePlayer();
    }
  }, [isYouTubeReady, audiobook]);

  // Initialize YouTube Player
  const initializeYouTubePlayer = useCallback(() => {
    if (!audiobook || !window.YT || !window.YT.Player) {
      console.log('[AudiobookTest] YouTube API not ready yet');
      return;
    }

    console.log('[AudiobookTest] Initializing YouTube player...');
    
    // @ts-ignore - YouTube API global
    const player = new window.YT.Player('youtube-player', {
      height: '315',
      width: '560',
      videoId: audiobook.source.video_id,
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onReady: (event: any) => {
          console.log('[AudiobookTest] YouTube player ready');
          playerRef.current = event.target;
          setIsAudioReady(true);
          startTimeTracking();
        },
        onStateChange: (event: any) => {
          const isPlaying = event.data === PLAYER_STATES.PLAYING;
          setVoiceState(prev => ({ ...prev, audioPlaying: isPlaying }));
          console.log('[AudiobookTest] Player state:', isPlaying ? 'PLAYING' : 'PAUSED');
        }
      }
    });
  }, [audiobook, PLAYER_STATES.PLAYING]);

  // Track current time and chapter
  const startTimeTracking = useCallback(() => {
    if (timeUpdateRef.current) {
      clearInterval(timeUpdateRef.current);
    }

    timeUpdateRef.current = setInterval(() => {
      if (playerRef.current) {
        const currentTime = playerRef.current.getCurrentTime();
        const currentChapter = getCurrentChapterFromTime(currentTime);
        
        setVoiceState(prev => ({
          ...prev,
          currentTime,
          currentChapter
        }));
      }
    }, 1000);
  }, []);

  // Get current chapter based on time position
  const getCurrentChapterFromTime = useCallback((timeSeconds: number): number => {
    if (!audiobook) return 1;
    
    const chapter = audiobook.chapters.find(ch => 
      timeSeconds >= ch.start_s && timeSeconds < ch.end_s
    );
    return chapter?.idx || 1;
  }, [audiobook]);

  // Initialize audio system for voice interaction
  const initializeAudioSystem = useCallback(async () => {
    if (!isAudioReady || audioManagerRef.current) return;

    try {
      console.log('[AudiobookTest] Initializing voice system...');

      // Check if audio modules are loaded
      if (typeof window.NaraAudioFactory === 'undefined') {
        throw new Error('Voice audio modules not loaded');
      }

      // Create audio pipeline with CONTINUOUS VOICE DETECTION
      const audioManager = await window.NaraAudioFactory.createAudioPipeline({
        vapiApiKey: '765f8644-1464-4b36-a4fe-c660e15ba313',
        vapiAssistantId: '73c59df7-34d0-4e5a-89b0-d0668982c8cc',
        // Configure for continuous voice activity detection
        vapi: {
          audioQuality: {
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          // Enable continuous voice activity detection with more sensitive settings
          voiceActivityDetection: {
            enabled: true,
            threshold: 0.3,      // More sensitive voice detection
            debounceMs: 200,     // Shorter wait time
            minSpeechDuration: 300,  // Shorter minimum speech
            maxSilenceDuration: 1000  // Stop after 1s of silence
          },
          // Start in continuous listening mode
          autoStart: true,
          // Configure proper Vapi TTS voice (not ElevenLabs)
          voice: {
            provider: 'cartesia',
            voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',  // Sonic (male)
            model: 'sonic-english',
            stability: 0.8,
            similarity: 0.8,
            speed: 1.0
          }
        }
      });

      audioManagerRef.current = audioManager;
      setupVoiceEventListeners(audioManager);
      
      // Start continuous voice activity detection automatically
      console.log('[AudiobookTest] Starting continuous voice detection...');
      await audioManager.startListening();
      
      console.log('[AudiobookTest] Voice system initialized with continuous listening');
    } catch (error) {
      console.error('[AudiobookTest] Voice system failed:', error);
      setError(`Voice system failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [isAudioReady]);

  // Set up voice event listeners for barge-in flow
  const setupVoiceEventListeners = useCallback((audioManager: any) => {
    console.log('[AudiobookTest] Setting up voice event listeners...');

    // 1. Voice detected → Pause YouTube
    audioManager.addEventListener('conversationStarted', async () => {
      console.log('[AudiobookTest] 🎤 Voice detected - Pausing audiobook');
      setVoiceState(prev => ({ ...prev, isListening: true }));
      
      if (playerRef.current) {
        playerRef.current.pauseVideo();
      }
    });

    // 2. User speech transcribed → Process with context
    audioManager.addEventListener('userMessage', (event: CustomEvent) => {
      const transcript = event.detail;
      console.log(`[AudiobookTest] 👤 User question: "${transcript}"`);
      
      const currentTime = voiceState.currentTime;
      const currentChapter = voiceState.currentChapter;
      
      // Add user message to conversation
      addConversationItem({
        type: 'user',
        content: transcript,
        timestamp: Date.now(),
        audioPosition: currentTime,
        chapter: currentChapter
      });
      
      // Process question with current context
      processContextualQuestion(transcript, currentTime, currentChapter);
    });

    // 3. AI response ready → Start TTS
    audioManager.addEventListener('assistantMessage', (event: CustomEvent) => {
      const response = event.detail;
      console.log(`[AudiobookTest] 🤖 AI response ready`);
      setVoiceState(prev => ({ ...prev, isSpeaking: true }));
    });

    // 4. TTS complete → Resume YouTube
    audioManager.addEventListener('conversationStopped', async () => {
      console.log('[AudiobookTest] ✅ Voice interaction complete - Resuming audiobook');
      setVoiceState(prev => ({ 
        ...prev, 
        isListening: false, 
        isSpeaking: false, 
        isProcessing: false 
      }));
      
      // Resume audiobook after small delay
      setTimeout(() => {
        if (playerRef.current) {
          playerRef.current.playVideo();
        }
      }, 500);
    });

    // Error handling
    audioManager.addEventListener('error', (event: CustomEvent) => {
      console.error('[AudiobookTest] Voice error:', event.detail);
      setError(`Voice error: ${event.detail.message || event.detail}`);
      
      // Reset state and try to resume
      setVoiceState(prev => ({ 
        ...prev, 
        isListening: false, 
        isSpeaking: false, 
        isProcessing: false 
      }));
      
      if (playerRef.current) {
        playerRef.current.playVideo();
      }
    });
  }, [voiceState.currentTime, voiceState.currentChapter]);

  // Process question with current audiobook context
  const processContextualQuestion = async (question: string, audioTime: number, chapter: number) => {
    setVoiceState(prev => ({ ...prev, isProcessing: true }));

    try {
      console.log('[AudiobookTest] Processing contextual question...');
      
      const response = await fetch('/api/voice-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask-question',
          question,
          context: {
            currentChapter: chapter,
            currentTime: audioTime,
            audioPosition: audioTime // Context up to this point only
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: ConversationItem = {
          type: 'assistant',
          content: data.result.answer,
          timestamp: Date.now(),
          audioPosition: audioTime,
          chapter: chapter,
          citations: data.result.citations
        };

        addConversationItem(assistantMessage);

        // Send the response back to Vapi for TTS
        if (audioManagerRef.current?.vapiService?.websocket) {
          const responseMessage = {
            type: 'assistant-response',
            content: data.result.answer
          };
          audioManagerRef.current.vapiService.websocket.send(JSON.stringify(responseMessage));
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('[AudiobookTest] Question processing failed:', error);
      setError(`Question processing failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setVoiceState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  // Add conversation item and scroll to bottom
  const addConversationItem = useCallback((item: ConversationItem) => {
    setConversation(prev => [...prev, item]);
    setTimeout(() => {
      conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Start voice listening
  const startListening = async () => {
    if (!audioManagerRef.current || voiceState.isListening) return;

    try {
      await audioManagerRef.current.startListening();
    } catch (error) {
      console.error('[AudiobookTest] Failed to start listening:', error);
      setError(`Failed to start listening: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Get current chapter info
  const currentChapterInfo = audiobook?.chapters.find(ch => ch.idx === voiceState.currentChapter);

  // Initialize voice system when audio is ready
  useEffect(() => {
    if (isAudioReady) {
      initializeAudioSystem();
    }
  }, [isAudioReady, initializeAudioSystem]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Load YouTube API */}
      <Script 
        src="https://www.youtube.com/iframe_api" 
        strategy="lazyOnload"
        onLoad={() => {
          console.log('[AudiobookTest] YouTube API script loaded');
          // Set global callback for when YouTube API is ready
          (window as any).onYouTubeIframeAPIReady = () => {
            console.log('[AudiobookTest] YouTube API ready');
            setIsYouTubeReady(true);
          };
        }}
      />
      
      {/* Load voice audio modules - VAPI ONLY (no separate TTS) */}
      <Script 
        src="/main/audio/BrowserVapiService.js" 
        strategy="lazyOnload"
        onLoad={() => console.log('[AudiobookTest] BrowserVapiService loaded')}
      />
      <Script 
        src="/main/audio/BrowserAudioManager.js" 
        strategy="lazyOnload"
        onLoad={() => console.log('[AudiobookTest] BrowserAudioManager loaded')}
      />
      <Script 
        src="/main/audio/browser-audio-modules.js" 
        strategy="lazyOnload"
        onLoad={() => console.log('[AudiobookTest] All audio modules loaded')}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        
        {/* Header */}
        <header className="p-6 border-b border-white/10">
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              🎧 Zero to One - Voice Barge-in Test
            </h1>
            <p className="text-slate-400 mt-2">
              Test continuous audio streaming with context-aware voice interruption
            </p>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex p-6 gap-6">
          
          {/* Left Panel - YouTube Player & Controls */}
          <div className="w-1/2 space-y-6">
            
            {/* YouTube Player */}
            <div className="bg-black rounded-lg overflow-hidden">
              <div id="youtube-player"></div>
            </div>

            {/* Status Panel */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <h3 className="font-semibold mb-3">📊 System Status</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 ${isYouTubeReady ? 'text-green-400' : 'text-red-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${isYouTubeReady ? 'bg-green-400' : 'bg-red-400'}`} />
                    YouTube API
                  </div>
                  <div className={`flex items-center gap-2 ${isAudioReady ? 'text-green-400' : 'text-yellow-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${isAudioReady ? 'bg-green-400' : 'bg-yellow-400'}`} />
                    Audio Player
                  </div>
                  <div className={`flex items-center gap-2 ${audioManagerRef.current ? 'text-green-400' : 'text-yellow-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${audioManagerRef.current ? 'bg-green-400' : 'bg-yellow-400'}`} />
                    Voice System
                  </div>
                </div>
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 ${voiceState.audioPlaying ? 'text-green-400' : 'text-slate-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${voiceState.audioPlaying ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`} />
                    Audio Playing
                  </div>
                  <div className={`flex items-center gap-2 ${voiceState.isListening ? 'text-blue-400' : 'text-slate-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${voiceState.isListening ? 'bg-blue-400 animate-pulse' : 'bg-slate-400'}`} />
                    Voice Active
                  </div>
                  <div className={`flex items-center gap-2 ${voiceState.isSpeaking ? 'text-purple-400' : 'text-slate-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${voiceState.isSpeaking ? 'bg-purple-400 animate-pulse' : 'bg-slate-400'}`} />
                    TTS Active
                  </div>
                </div>
              </div>
            </div>

            {/* Current Position */}
            <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
              <h3 className="font-semibold text-blue-400 mb-3">📍 Current Position</h3>
              <div className="space-y-2 text-sm">
                <div>Time: {formatTime(voiceState.currentTime)}</div>
                {currentChapterInfo && (
                  <>
                    <div>Chapter {currentChapterInfo.idx}: {currentChapterInfo.title}</div>
                    <div className="text-slate-400">
                      {formatTime(currentChapterInfo.start_s)} - {formatTime(currentChapterInfo.end_s)}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Voice Control */}
            <div className="p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-500/20">
              <h3 className="font-semibold mb-3 text-center">🎤 Voice Barge-in</h3>
              
              <button
                onClick={startListening}
                disabled={!audioManagerRef.current || voiceState.isListening || voiceState.isProcessing}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                {voiceState.isListening 
                  ? '🎤 Listening...' 
                  : voiceState.isProcessing 
                  ? '⏳ Processing...' 
                  : voiceState.isSpeaking
                  ? '🔊 Speaking...'
                  : '🎤 Ask a Question'
                }
              </button>

              <div className="mt-3 text-xs text-slate-400 text-center">
                Click to interrupt and ask a context-aware question
              </div>
            </div>
          </div>

          {/* Right Panel - Conversation History */}
          <div className="flex-1 flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-center">💬 Conversation History</h2>
            
            {/* Conversation Area */}
            <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
              {conversation.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  <p className="mb-2">🤔 No questions yet</p>
                  <p className="text-sm">Start the audiobook and interrupt with voice questions!</p>
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
                              Chapter {item.chapter} • {formatTime(item.audioPosition)} • {new Date(item.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <p className="whitespace-pre-wrap">{item.content}</p>
                        
                        {/* Citations */}
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
                      </div>
                    </div>
                  ))}
                  <div ref={conversationEndRef} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-6 border-t border-white/10">
          <div className="max-w-4xl mx-auto text-sm text-slate-400">
            <h4 className="font-semibold mb-2">🧪 Test Instructions:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click play on the YouTube audiobook above</li>
              <li>Let it play for a few moments to establish context</li>
              <li>Click the 🎤 "Ask a Question" button to interrupt</li>
              <li>Ask a question about what you just heard</li>
              <li>The system should pause, process your question with current context, respond, then resume</li>
            </ol>
            <div className="mt-3 p-3 bg-green-900/20 rounded border border-green-500/20">
              <strong className="text-green-400">✅ Success criteria:</strong> 
              <span className="ml-2">Audio pauses → contextual Q&A → voice response → audio resumes</span>
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