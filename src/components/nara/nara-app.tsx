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
// Import the real audio system
import { VoiceAgentBridge, VoiceContext } from "../../../main/audio/VoiceAgentBridge";
import { AudioOrchestrator } from "../../../main/audio/AudioOrchestrator";
import { VapiService } from "../../../main/audio/VapiService";
import { TTSService } from "../../../main/audio/TTSService";
import { AudioManager } from "../../../main/audio/AudioManager";

export function NaraApp() {
  const [selectedBookId, setSelectedBookId] = React.useState<string | null>(null);
  const [isVoiceAgentActive, setIsVoiceAgentActive] = React.useState(false);
  const [isListening, setIsListening] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const { 
    currentBook, 
    isPlaying, 
    currentPosition, 
    togglePlayback, 
    setPlaybackSpeed, 
    playbackSpeed 
  } = useAudiobook();
  
  const { notes, addNote } = useNotes();

  // Audio system refs
  const voiceAgentBridge = React.useRef<VoiceAgentBridge | null>(null);
  const audioOrchestrator = React.useRef<AudioOrchestrator | null>(null);

  // Initialize audio system
  React.useEffect(() => {
    if (selectedBookId && currentBook) {
      const initAudioSystem = async () => {
        try {
          // Initialize audio services
          const vapi = new VapiService();
          const tts = new TTSService();
          const audio = new AudioManager();
          const orchestrator = new AudioOrchestrator();
          
          // Set up voice context for current book
          const voiceContext: VoiceContext = {
            audiobookId: currentBook.id,
            datasetPath: `/data/${currentBook.id}.json`, // Assumes book data exists
            currentPosition_s: currentPosition,
            userProgressIdx: Math.floor(currentPosition / 60), // Rough chapter estimation
            modeHint: "auto"
          };

          // Initialize voice agent bridge
          const bridge = new VoiceAgentBridge({
            vapi,
            tts,
            audio,
            orchestrator,
            context: voiceContext,
            runner: null // Will be initialized when needed
          });

          // Set up event listeners
          bridge.on('interactionStart', () => {
            setIsListening(true);
            setIsVoiceAgentActive(true);
          });

          bridge.on('interactionEnd', (result) => {
            setIsListening(false);
            setIsVoiceAgentActive(false);
            
            // Add note if there was a conversation
            if (result.question && result.answer) {
              addNote({
                id: Date.now().toString(),
                title: "Voice Discussion",
                content: `Q: ${result.question}\n\nA: ${result.answer}`,
                timestamp: Date.now() / 1000,
                audiobookPosition: currentPosition,
                topic: "Voice Chat"
              });
            }
          });

          voiceAgentBridge.current = bridge;
          audioOrchestrator.current = orchestrator;

          console.log('[Audio System] Initialized successfully');
        } catch (error) {
          console.error('[Audio System] Failed to initialize:', error);
        }
      };

      initAudioSystem();
    }

    return () => {
      // Cleanup
      if (voiceAgentBridge.current) {
        voiceAgentBridge.current.removeAllListeners();
      }
    };
  }, [selectedBookId, currentBook, currentPosition, addNote]);

  const handleNarratorActivate = async () => {
    try {
      if (!voiceAgentBridge.current) {
        console.warn('[Voice Agent] Audio system not initialized');
        return;
      }

      if (isListening) {
        // Stop current voice interaction
        await voiceAgentBridge.current.stopInteraction();
        console.log('[Voice Agent] Stopped listening');
      } else {
        // Start voice interaction
        console.log('[Voice Agent] Starting voice interaction...');
        
        // Update voice context with current position
        const updatedContext: VoiceContext = {
          audiobookId: currentBook.id,
          datasetPath: `/data/${currentBook.id}.json`,
          currentPosition_s: currentPosition,
          userProgressIdx: Math.floor(currentPosition / 60),
          modeHint: "auto"
        };

        // Start voice interaction with real audio system
        await voiceAgentBridge.current.startInteraction(updatedContext);
        
        // Pause audiobook if playing and not muted
        if (isPlaying && !isMuted && audioOrchestrator.current) {
          audioOrchestrator.current.pauseBackgroundAudio();
        }
      }
    } catch (error) {
      console.error('[Voice Agent] Activation failed:', error);
      setIsVoiceAgentActive(false);
      setIsListening(false);
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    console.log(`[Audio] ${!isMuted ? 'Muted' : 'Unmuted'}`);
    
    // Mute/unmute the audio system
    if (audioOrchestrator.current) {
      if (!isMuted) {
        // Muting - stop any active interactions and duck audio
        audioOrchestrator.current.duckAudio(0.1); // Very low volume
      } else {
        // Unmuting - restore normal audio levels
        audioOrchestrator.current.resumeAudio();
      }
    }
  };

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

  return (
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
        
        {/* Connected Voice Control Buttons */}
        <div className="flex items-center gap-2">
          {/* Mute button */}
          <Button 
            size="lg" 
            className={`
              rounded-full shadow-xl h-14 w-14 min-w-14 border-none transition-all duration-300 hover:scale-105
              ${isMuted 
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                : 'bg-gray-600 hover:bg-gray-700 text-white hover:shadow-xl'
              }
            `}
            onPress={handleMuteToggle}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            <Icon 
              icon={isMuted ? "lucide:mic-off" : "lucide:mic"} 
              width={20} 
              className="text-white"
            />
          </Button>

          {/* Hey Narrator button */}
          <Button 
            size="lg" 
            className={`
              rounded-full shadow-xl flex items-center gap-3 font-medium px-6 py-3 h-14 border-none 
              transition-all duration-300 hover:scale-105
              ${isListening 
                ? 'bg-[#4CAF50] hover:bg-[#45a049] text-white animate-pulse shadow-[0_0_20px_rgba(76,175,80,0.6)]' // Listening - green with glow
                : 'bg-[#8B7355] hover:bg-[#7A6348] text-white hover:shadow-2xl' // Inactive - brown
              }
            `}
            onPress={handleNarratorActivate}
          >
            <Icon 
              icon={isListening ? "lucide:mic" : "lucide:mic"} 
              width={20} 
              className={`text-white transition-transform duration-200 ${isListening ? 'animate-bounce' : ''}`}
            />
            {isListening ? 'Listening...' : 'Hey Narrator'}
          </Button>
        </div>
      </div>
    </div>
  );
}
