"use client";

import React from "react";
import { Button } from "@heroui/react";
import { AudiobookPanel } from "./audiobook-panel";
import { NotesPanel } from "./notes-panel";
import { TopBar } from "./top-bar";
import { useAudiobook } from "@/hooks/nara/use-audiobook";
import { useNotes } from "@/hooks/nara/use-notes";
import { Icon } from "@iconify/react";
import { Dashboard } from "./dashboard";
import Script from 'next/script';

export function NaraApp() {
  const [selectedBookId, setSelectedBookId] = React.useState<string | null>(null);
  const [isVoiceAgentActive, setIsVoiceAgentActive] = React.useState(false);
  const [isListening, setIsListening] = React.useState(false);
  
  // Audio state management refs to prevent race conditions
  const currentAudioRef = React.useRef<'audiobook' | 'tts' | null>(null);
  const ttsAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const isInterruptedRef = React.useRef(false);
  
  // Voice interaction refs to prevent multiple LLM query race conditions
  const currentQueryRef = React.useRef<string | null>(null);
  const processingQueryRef = React.useRef<boolean>(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const queryQueueRef = React.useRef<string[]>([]);
  const vapiServiceRef = React.useRef<any>(null);
  
  // VAD and continuous listening refs
  const vadProcessorRef = React.useRef<any>(null);
  const audioOrchestratorRef = React.useRef<any>(null);
  const isListeningContinuously = React.useRef(false);
  const [isVoiceSystemAvailable, setIsVoiceSystemAvailable] = React.useState(false);
  
  const { 
    currentBook, 
    isPlaying, 
    currentPosition, 
    togglePlayback,
    play,
    pause,
    setPlaybackSpeed, 
    playbackSpeed,
    loading: bookLoading,
    error: bookError,
    isAudioMuted,
    muteAudiobook,
    unmuteAudiobook,
    toggleMute
  } = useAudiobook({ bookId: selectedBookId || undefined });
  
  const { 
    notes, 
    addNote,
    loading: notesLoading,
    error: notesError 
  } = useNotes({ bookId: selectedBookId || undefined });

  // Process voice query with race condition prevention
  const processVoiceQuery = async (transcript: string): Promise<void> => {
    // Prevent multiple queries from processing simultaneously
    if (processingQueryRef.current) {
      console.log('[Voice Agent] Query already in progress, queueing:', transcript);
      queryQueueRef.current.push(transcript);
      return;
    }

    // Cancel any ongoing query
    if (abortControllerRef.current) {
      console.log('[Voice Agent] Aborting previous query');
      abortControllerRef.current.abort();
    }

    processingQueryRef.current = true;
    currentQueryRef.current = transcript;
    abortControllerRef.current = new AbortController();

    try {
      console.log(`[Voice Agent] Processing query: "${transcript}"`);
      
      // Stop Vapi listening (but keep connection for next interaction)
      if (vapiServiceRef.current) {
        vapiServiceRef.current.stopConversation();
      }
      
      // Process through VoiceAgentBridge which handles LangGraph → 11labs TTS pipeline
      const response = await fetch('/api/voice-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask-question',
          question: transcript,
          context: {
            currentChapter: 1,
            currentTime: currentPosition,
            audioPosition: currentPosition
          }
        }),
        signal: abortControllerRef.current.signal
      });

      const data = await response.json();
      
      // Check if this query was aborted
      if (abortControllerRef.current?.signal.aborted) {
        console.log('[Voice Agent] Query was aborted');
        return;
      }
      
      if (data.success) {
        console.log('[Voice Agent] LangGraph response received:', data.result);
        
        // Create note from the interaction (answer is already cleaned by API)
        await createNoteFromVoiceInteraction(transcript, data.result.answer);
        
        // Play TTS audio from 11labs via LangGraph response
        if (data.result.audioBuffer) {
          console.log('[Voice Agent] Playing 11labs TTS response from LangGraph');
          await playTTSAudio(data.result.audioBuffer);
        }
        
        // Handle playback hints from LangGraph if provided
        if (data.result.playbackHint) {
          console.log('[Voice Agent] Seek hint:', data.result.playbackHint);
          // TODO: Implement seek to playback hint position
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('[Voice Agent] VoiceAgentBridge processing failed:', error);
      }
    } finally {
      processingQueryRef.current = false;
      currentQueryRef.current = null;
      abortControllerRef.current = null;
      
      setIsListening(false);
      setIsVoiceAgentActive(false);
      
      // Process next query in queue if any
      const nextQuery = queryQueueRef.current.shift();
      if (nextQuery) {
        console.log('[Voice Agent] Processing queued query:', nextQuery);
        setTimeout(() => processVoiceQuery(nextQuery), 100);
      }
    }
  };

  // Initialize voice system only when user explicitly requests it
  const initializeVoiceService = async () => {
    try {
      console.log('[Voice Agent] Initializing voice system (user requested)...');

      // Check if voice modules are available first
      if (typeof window.NaraAudioFactory === 'undefined') {
        console.warn('[Voice Agent] Voice audio modules not loaded - voice features unavailable');
        return false;
      }

      // Request microphone permission only when user wants voice features
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        console.log('[Voice Agent] Microphone permission granted');
        
        // Stop the test stream immediately to avoid keeping mic active
        mediaStream.getTracks().forEach(track => track.stop());
      } catch (permissionError) {
        console.warn('[Voice Agent] Microphone permission denied:', permissionError);
        return false;
      }

      // Initialize VAD processor if available
      if (window.NaraAudioFactory.createVADProcessor) {
        vadProcessorRef.current = await window.NaraAudioFactory.createVADProcessor({
          frameSize: 20,
          threshold: 0.6,
          hysteresis: {
            speechFrames: 3,
            totalFrames: 5,
            silenceMs: 250
          },
          sampleRate: 48000
        });

        // Set up VAD event handlers
        vadProcessorRef.current.on('speechStart', async (data) => {
          console.log('[Voice Agent] Speech detected');
          setIsListening(true);
          setIsVoiceAgentActive(true);
          
          // Interrupt TTS if playing
          if (currentAudioRef.current === 'tts') {
            enableTTSInterruption();
          }
          // Pause audiobook when speech is detected
          else if (isPlaying && currentAudioRef.current === 'audiobook') {
            pause();
            console.log('[Voice Agent] Paused audiobook for voice input');
          }
        });

        vadProcessorRef.current.on('speechEnd', () => {
          console.log('[Voice Agent] Speech ended');
          setIsListening(false);
          setIsVoiceAgentActive(false);
        });

        await vadProcessorRef.current.initialize();
        await vadProcessorRef.current.start();
        console.log('[Voice Agent] VAD processor ready');
      }

      // Initialize Vapi service for STT
      const vapiService = await window.NaraAudioFactory.createVapiService({
        apiKey: '765f8644-1464-4b36-a4fe-c660e15ba313',
        assistantId: '73c59df7-34d0-4e5a-89b0-d0668982c8cc',
        sttOnly: true,
        continuousListening: true
      });

      // Set up transcript handling
      vapiService.addEventListener('userTranscript', async (event: CustomEvent) => {
        const transcript = event.detail;
        console.log(`[Voice Agent] STT: "${transcript}"`);
        
        if (isListeningContinuously.current) {
          await processVoiceQuery(transcript);
        }
      });

      vapiServiceRef.current = vapiService;
      
      // Start listening
      await vapiService.startConversation();
      isListeningContinuously.current = true;
      
      console.log('[Voice Agent] Voice system ready');
      return true;
      
    } catch (error) {
      console.error('[Voice Agent] Voice system initialization failed:', error);
      return false;
    }
  };

  // Manual voice activation function - starts continuous listening
  const activateVoiceSystem = async () => {
    const success = await initializeVoiceService();
    setIsVoiceSystemAvailable(success);
    
    if (success) {
      console.log('[Voice Agent] Voice system activated - continuous listening enabled');
      // Voice system is now always on and listening for wake words/speech
    } else {
      console.warn('[Voice Agent] Voice system activation failed');
    }
    
    return success;
  };

  // Deactivate voice system
  const deactivateVoiceSystem = () => {
    console.log('[Voice Agent] Deactivating voice system');
    
    // Stop VAD processor
    if (vadProcessorRef.current) {
      vadProcessorRef.current.stop();
      vadProcessorRef.current.destroy();
      vadProcessorRef.current = null;
    }
    
    // Stop voice service
    if (vapiServiceRef.current) {
      vapiServiceRef.current.stopConversation();
      vapiServiceRef.current = null;
    }
    
    // Reset states
    isListeningContinuously.current = false;
    setIsListening(false);
    setIsVoiceAgentActive(false);
    setIsVoiceSystemAvailable(false);
    
    console.log('[Voice Agent] Voice system deactivated');
  };

  // Create note from voice interaction (separate from TTS handling)
  const createNoteFromVoiceInteraction = async (transcript: string, response: string) => {
    try {
      const noteResponse = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: 'zero-to-one',
          title: "Voice Discussion",
          content: `Q: ${transcript}\n\nA: ${response}`,
          timestamp: Date.now() / 1000,
          audiobookPosition: currentPosition,
          topic: "Voice Chat",
          userQuestion: transcript,
          aiResponse: response
        })
      });

      const data = await noteResponse.json();
      if (data.success) {
        addNote(data.note);
        console.log('[Voice Agent] Note created:', data.note.id);
      } else {
        console.error('[Voice Agent] Failed to create note:', data.error);
      }
    } catch (error) {
      console.error('[Voice Agent] Note creation failed:', error);
    }
  };

  // Play TTS audio with proper audiobook timer pausing
  const playTTSAudio = async (base64AudioBuffer: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        // Pause audiobook playback (this stops the timer)
        if (isPlaying) {
          pause();
          console.log('[Voice Agent] Paused audiobook for TTS playback');
        }
        
        // Mute audiobook as backup
        muteAudiobook();
        currentAudioRef.current = 'tts';
        
        // Convert base64 to blob
        const binaryData = atob(base64AudioBuffer);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        ttsAudioRef.current = audio;
        
        // Configure audio playback
        audio.volume = 0.9;
        
        // Set up event handlers
        audio.addEventListener('ended', () => {
          console.log('[Voice Agent] TTS playback completed - resuming audiobook');
          URL.revokeObjectURL(audioUrl);
          ttsAudioRef.current = null;
          currentAudioRef.current = 'audiobook';
          
          // Resume audiobook playback at the same position
          unmuteAudiobook();
          setTimeout(() => {
            if (!isInterruptedRef.current) {
              play();
            }
          }, 300);
          
          isInterruptedRef.current = false;
          resolve();
        });
        
        audio.addEventListener('error', (error) => {
          console.error('[Voice Agent] TTS audio playback error:', error);
          URL.revokeObjectURL(audioUrl);
          ttsAudioRef.current = null;
          currentAudioRef.current = null;
          
          // Resume audiobook on error
          unmuteAudiobook();
          if (!isInterruptedRef.current) {
            play();
          }
          reject(error);
        });
        
        // Start playback
        audio.play().catch(reject);
        console.log('[Voice Agent] TTS playback started - audiobook timer paused');
        
      } catch (error) {
        console.error('[Voice Agent] TTS audio setup failed:', error);
        currentAudioRef.current = null;
        // Resume audiobook on setup error
        unmuteAudiobook();
        if (!isInterruptedRef.current) {
          play();
        }
        reject(error);
      }
    });
  };
  
  // Stop current audio to prevent race conditions
  const stopCurrentAudio = () => {
    if (currentAudioRef.current === 'audiobook' && isPlaying) {
      muteAudiobook(); // Mute instead of pausing to maintain position
      console.log('[Audio State] Muted audiobook for new audio');
    }
    
    if (currentAudioRef.current === 'tts' && ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
      console.log('[Audio State] Stopped TTS for new audio');
    }
  };

  // Enable voice interruption of TTS
  const enableTTSInterruption = () => {
    if (ttsAudioRef.current && currentAudioRef.current === 'tts') {
      console.log('[Voice Agent] TTS interrupted by voice input');
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
      currentAudioRef.current = null;
      
      // Resume audiobook playback
      setTimeout(() => {
        currentAudioRef.current = 'audiobook';
        unmuteAudiobook();
        play();
      }, 100);
    }
  };

  const handleMuteToggle = () => {
    toggleMute();
    console.log(`[Audio] ${!isAudioMuted ? 'Muted' : 'Unmuted'} audiobook`);
  };


  React.useEffect(() => {
    // Only set up cleanup - no automatic voice initialization
    return () => {
      // Cancel ongoing queries
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear query queue
      queryQueueRef.current = [];
      
      // Stop VAD processor
      if (vadProcessorRef.current) {
        vadProcessorRef.current.stop();
        vadProcessorRef.current.destroy();
      }
      
      // Stop voice service
      if (vapiServiceRef.current) {
        vapiServiceRef.current.stopConversation();
      }
      
      // Stop TTS audio
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
      
      isListeningContinuously.current = false;
    };
  }, []);

  // Handle book selection from dashboard
  const handleSelectBook = (bookId: string) => {
    setSelectedBookId(bookId);
  };

  // Return to dashboard
  const handleBackToDashboard = () => {
    setSelectedBookId(null);
  };

  // Test function to add sample notes (for demonstrating auto-scroll)
  const addTestNote = () => {
    const sampleNotes = [
      {
        title: "The Power of Atomic Habits",
        content: "Small changes compound over time to create remarkable results. Focus on systems rather than goals. Habits are the compound interest of self-improvement - 1% better every day leads to 37x improvement in a year.",
        topic: "Habit Formation"
      },
      {
        title: "Identity-Based Habits", 
        content: "The most effective way to change your habits is to focus on who you wish to become, not what you want to achieve. Every action is a vote for the type of person you want to become. Identity change is the North Star of habit change.",
        topic: "Identity & Change"
      },
      {
        title: "The 4 Laws of Behavior Change",
        content: "Make it obvious, make it attractive, make it easy, make it satisfying. Breaking bad habits requires inverting these laws. Environment design is crucial for habit formation - create obvious cues for good habits.",
        topic: "Behavior Design"
      },
      {
        title: "The 2-Minute Rule",
        content: "When you start a new habit, it should take less than two minutes to do. The idea is to make your habits as easy as possible to start. Once you've established the habit of showing up, you can improve your performance.",
        topic: "Implementation"
      },
      {
        title: "Habit Stacking",
        content: "After I [CURRENT HABIT], I will [NEW HABIT]. This technique uses the natural momentum of one behavior to kickstart the next. It's a powerful way to build new routines by anchoring them to existing habits.",
        topic: "Implementation"
      }
    ];

    const randomNote = sampleNotes[Math.floor(Math.random() * sampleNotes.length)];
    addNote({
      id: Date.now().toString(),
      title: randomNote.title,
      content: randomNote.content,
      timestamp: Date.now() / 1000, // Use current time in seconds for realistic ordering
      audiobookPosition: currentPosition, // Capture current audiobook position
      topic: randomNote.topic
    });
  };

  // Render dashboard or audiobook interface based on selection
  if (!selectedBookId) {
    return <Dashboard onSelectBook={handleSelectBook} />;
  }

  // Show loading state while book data is loading
  if (bookLoading && !currentBook) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Loading audiobook...</p>
        </div>
      </div>
    );
  }

  // Show error state if book failed to load
  if (bookError || !currentBook) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <Icon icon="lucide:alert-circle" className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-foreground mb-4">Failed to load audiobook</p>
          <p className="text-muted-foreground text-sm mb-4">{bookError}</p>
          <Button onPress={() => setSelectedBookId(null)}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Load YouTube API for audiobook player */}
      <Script 
        src="https://www.youtube.com/iframe_api" 
        strategy="lazyOnload"
        onLoad={() => console.log('[NaraApp] YouTube API loaded')}
      />
      
      {/* Load voice audio modules for voice integration */}
      <Script 
        src="/main/audio/BrowserVapiService.js" 
        strategy="lazyOnload"
        onLoad={() => console.log('[NaraApp] BrowserVapiService loaded')}
      />
      <Script 
        src="/main/audio/BrowserAudioManager.js" 
        strategy="lazyOnload"
        onLoad={() => console.log('[NaraApp] BrowserAudioManager loaded')}
      />
      <Script 
        src="/main/audio/browser-audio-modules.js" 
        strategy="lazyOnload"
        onLoad={() => console.log('[NaraApp] All audio modules loaded')}
      />

      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <TopBar 
        book={currentBook}
        isPlaying={isPlaying}
        currentPosition={currentPosition}
        togglePlayback={togglePlayback}
        playbackSpeed={playbackSpeed}
        setPlaybackSpeed={setPlaybackSpeed}
        onBackToDashboard={handleBackToDashboard}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <AudiobookPanel 
          book={currentBook}
          currentPosition={currentPosition}
          isPlaying={isPlaying}
        />
        <NotesPanel notes={notes} />
      </div>
      
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
        {/* Test button for demonstrating auto-scroll */}
        <Button 
          size="sm" 
          className="rounded-full shadow-lg bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 border-none transition-all duration-200"
          onPress={addTestNote}
        >
          <Icon icon="lucide:plus" width={16} className="text-white" />
          Add Test Note
        </Button>
        
        {/* Voice System Status */}
        <div className="flex items-center gap-2">
          {/* Mute button */}
          <Button 
            size="lg" 
            className={`
              rounded-full shadow-xl h-14 w-14 min-w-14 border-none transition-all duration-300 hover:scale-105
              ${isAudioMuted 
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                : 'bg-gray-600 hover:bg-gray-700 text-white hover:shadow-xl'
              }
            `}
            onPress={handleMuteToggle}
            aria-label={isAudioMuted ? "Unmute" : "Mute"}
          >
            <Icon 
              icon={isAudioMuted ? "lucide:volume-x" : "lucide:volume-2"} 
              width={20} 
              className="text-white"
            />
          </Button>

          {/* Voice System Activation */}
          {!isVoiceSystemAvailable ? (
            <Button
              size="lg" 
              className={`
                rounded-full shadow-xl flex items-center gap-3 font-medium px-6 py-3 h-14 border-none 
                transition-all duration-300 hover:scale-105
                bg-blue-500 hover:bg-blue-600 text-white shadow-lg
              `}
              onPress={activateVoiceSystem}
            >
              <Icon 
                icon="lucide:mic" 
                width={20} 
                className="text-white"
              />
              <span className="text-sm">Enable Voice Assistant</span>
            </Button>
          ) : (
            <div className="flex gap-2">
              <div 
                className={`
                  rounded-full shadow-xl flex items-center gap-3 font-medium px-6 py-3 h-14 border-none 
                  transition-all duration-300
                  ${isListening 
                    ? 'bg-[#4CAF50] text-white animate-pulse shadow-[0_0_20px_rgba(76,175,80,0.6)]' // Active - green with glow
                    : 'bg-[#8B7355] text-white shadow-lg' // Ready - brown
                  }
                `}
              >
                <Icon 
                  icon="lucide:ear" 
                  width={20} 
                  className={`text-white transition-transform duration-200 ${isListening ? 'animate-bounce' : ''}`}
                />
                <span className="text-sm">
                  {isListening ? 'Listening...' : 'Voice Ready'}
                </span>
              </div>
              
              {/* Voice system deactivate button */}
              <Button
                size="sm" 
                className="rounded-full shadow-lg h-14 w-14 min-w-14 border-none bg-red-500 hover:bg-red-600 text-white transition-all duration-300 hover:scale-105"
                onPress={deactivateVoiceSystem}
                aria-label="Disable Voice System"
              >
                <Icon 
                  icon="lucide:mic-off" 
                  width={16} 
                  className="text-white"
                />
              </Button>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
