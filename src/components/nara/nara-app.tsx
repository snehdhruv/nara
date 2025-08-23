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
// Import browser-compatible audio services (no fs dependency)
import { AudioOrchestrator } from "../../../main/audio/AudioOrchestrator";

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
  const audioOrchestrator = React.useRef<AudioOrchestrator | null>(null);
  const browserAudioManager = React.useRef<any>(null);

  // Initialize browser-compatible audio system
  React.useEffect(() => {
    if (selectedBookId && currentBook) {
      const initBrowserAudio = async () => {
        try {
          // Initialize browser audio orchestrator
          const orchestrator = new AudioOrchestrator();
          audioOrchestrator.current = orchestrator;

          // Load browser audio modules
          if (typeof window !== 'undefined') {
            // Load browser audio manager from public folder
            const script = document.createElement('script');
            script.src = '/main/audio/BrowserAudioManager.js';
            script.onload = () => {
              console.log('[Audio System] Browser audio manager loaded');
              // @ts-ignore - Browser module
              if (window.NaraAudioFactory) {
                // @ts-ignore
                browserAudioManager.current = window.NaraAudioFactory;
              }
            };
            document.head.appendChild(script);
          }

          console.log('[Audio System] Browser-compatible audio initialized');
        } catch (error) {
          console.error('[Audio System] Failed to initialize browser audio:', error);
        }
      };

      initBrowserAudio();
    }

    return () => {
      // Cleanup - browser audio doesn't need explicit cleanup
      console.log('[Audio System] Cleanup completed');
    };
  }, [selectedBookId, currentBook]);

  const handleNarratorActivate = async () => {
    try {
      if (isListening) {
        // Stop current voice interaction
        setIsListening(false);
        setIsVoiceAgentActive(false);
        console.log('[Voice Agent] Stopped listening');
        
        // Resume audiobook if it was paused
        console.log('[Voice Agent] Audio interaction ended');
      } else {
        // Start voice interaction
        console.log('[Voice Agent] Starting voice interaction...');
        setIsListening(true);
        setIsVoiceAgentActive(true);
        
        // Pause audiobook if playing and not muted
        if (isPlaying && !isMuted) {
          togglePlayback(); // Simple pause for now
        }

        // Use browser audio manager if available
        if (browserAudioManager.current) {
          try {
            const audioSession = await browserAudioManager.current.createAudioPipeline({
              audiobookId: currentBook?.id || 'unknown',
              currentPosition: currentPosition,
              mode: 'voice-qa'
            });
            
            // Set up voice interaction handlers
            audioSession.on('voiceResponse', (data: any) => {
              // Add the conversation as a note
              addNote({
                id: Date.now().toString(),
                title: "Voice Discussion", 
                content: `Q: ${data.question}\n\nA: ${data.answer}`,
                timestamp: Date.now() / 1000,
                audiobookPosition: currentPosition,
                topic: "Voice Chat"
              });
              
              // Reset state
              setIsListening(false);
              setIsVoiceAgentActive(false);
            });
            
            console.log('[Voice Agent] Audio session started');
          } catch (error) {
            console.error('[Voice Agent] Browser audio failed:', error);
            // Fallback to basic mock interaction
            setTimeout(() => {
              addNote({
                id: Date.now().toString(),
                title: "Voice Discussion",
                content: `Q: [User asked about the book at ${Math.floor(currentPosition/60)}:${Math.floor(currentPosition%60).toString().padStart(2,'0')}]\n\nA: [AI response about the content at this position]`,
                timestamp: Date.now() / 1000,
                audiobookPosition: currentPosition,
                topic: "Voice Chat"
              });
              setIsListening(false);
              setIsVoiceAgentActive(false);
            }, 3000);
          }
        } else {
          // Basic fallback for demo purposes
          setTimeout(() => {
            addNote({
              id: Date.now().toString(),
              title: "Voice Discussion",
              content: `Q: [User question at position ${Math.floor(currentPosition/60)}:${Math.floor(currentPosition%60).toString().padStart(2,'0')}]\n\nA: This is a demo response. The full voice system will be available when audio services are configured.`,
              timestamp: Date.now() / 1000,
              audiobookPosition: currentPosition,
              topic: "Voice Chat"
            });
            setIsListening(false);
            setIsVoiceAgentActive(false);
          }, 2000);
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
    
    // Simple mute state - the actual audio ducking will be handled by the browser audio manager
    if (browserAudioManager.current) {
      try {
        if (!isMuted) {
          // Muting
          browserAudioManager.current.setVolume?.(0.1);
        } else {
          // Unmuting  
          browserAudioManager.current.setVolume?.(1.0);
        }
      } catch (error) {
        console.log('[Audio] Mute toggle - browser audio manager not fully loaded');
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
