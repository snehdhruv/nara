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

export function NaraApp() {
  const [selectedBookId, setSelectedBookId] = React.useState<string | null>(null);
  const [isVoiceAgentActive, setIsVoiceAgentActive] = React.useState(false);
  const [isListening, setIsListening] = React.useState(false);
  const { 
    currentBook, 
    isPlaying, 
    currentPosition, 
    togglePlayback, 
    setPlaybackSpeed, 
    playbackSpeed 
  } = useAudiobook();
  
  const { notes, addNote } = useNotes();

  const handleNarratorActivate = async () => {
    try {
      // Toggle voice agent state
      if (isVoiceAgentActive) {
        // Deactivate voice agent
        setIsVoiceAgentActive(false);
        setIsListening(false);
        console.log('[Voice Agent] Deactivated');
        // TODO: Stop voice service when audio team provides interface
      } else {
        // Activate voice agent
        setIsVoiceAgentActive(true);
        setIsListening(true);
        console.log('[Voice Agent] Activated - Listening for "Hey Nara"...');
        
        // Pause current playback if active
        if (isPlaying) {
          togglePlayback();
        }
        
        // TODO: Initialize voice service when audio team provides interface
        // Example: await voiceService.startListening();
        
        // Simulate listening timeout for demo
        setTimeout(() => {
          setIsListening(false);
        }, 5000);
      }
    } catch (error) {
      console.error('[Voice Agent] Activation failed:', error);
      setIsVoiceAgentActive(false);
      setIsListening(false);
    }
  };

  // Voice response handler - will be connected when audio team provides interface
  const handleVoiceResponse = React.useCallback((transcript: string, response: string) => {
    // Handle voice interaction completion
    addNote({
      id: Date.now().toString(),
      title: "Voice Discussion",
      content: `Q: ${transcript}\n\nA: ${response}`,
      timestamp: Date.now() / 1000, // Use current time for proper ordering
      audiobookPosition: currentPosition, // Capture where in the book the conversation happened
      topic: "Voice Chat"
    });
    
    // Reset listening state
    setIsListening(false);
  }, [addNote, currentPosition]);

  React.useEffect(() => {
    // TODO: Setup voice service event listeners when available
    // voiceService.on('transcription', handleVoiceResponse);
    // return () => voiceService.off('transcription', handleVoiceResponse);
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
        
        {/* Main Hey Narrator button */}
        <Button 
          size="lg" 
          className={`
            rounded-full shadow-xl flex items-center gap-3 font-medium px-6 py-3 border-none 
            transition-all duration-300 hover:scale-105
            ${isVoiceAgentActive 
              ? isListening 
                ? 'bg-[#4CAF50] hover:bg-[#45a049] text-white animate-pulse shadow-[0_0_20px_rgba(76,175,80,0.6)]' // Active listening - green with glow
                : 'bg-[#FF9800] hover:bg-[#F57C00] text-white shadow-[0_0_15px_rgba(255,152,0,0.5)]' // Active waiting - orange with glow
              : 'bg-[#8B7355] hover:bg-[#7A6348] text-white hover:shadow-2xl' // Inactive - brown
            }
          `}
          onPress={handleNarratorActivate}
        >
          <Icon 
            icon={isVoiceAgentActive ? (isListening ? "lucide:mic" : "lucide:mic-off") : "lucide:mic"} 
            width={20} 
            className={`text-white transition-transform duration-200 ${isListening ? 'animate-bounce' : ''}`}
          />
          {isVoiceAgentActive 
            ? (isListening ? 'Listening...' : 'Voice Active') 
            : 'Hey Narrator'
          }
        </Button>
      </div>
    </div>
  );
}
