"use client";

import React from "react";
import { Button, useDisclosure, Divider } from "@heroui/react";
import { AudiobookPanel } from "./audiobook-panel";
import { NotesPanel } from "./notes-panel";
import { TopBar } from "./top-bar";
import { NarratorModal } from "./narrator-modal";
import { useAudiobook } from "@/hooks/nara/use-audiobook";
import { useNotes } from "@/hooks/nara/use-notes";
import { Icon } from "@iconify/react"; // Add missing Icon import
import { Dashboard } from "./dashboard";

export function NaraApp() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedBookId, setSelectedBookId] = React.useState<string | null>(null);
  const { 
    currentBook, 
    isPlaying, 
    currentPosition, 
    togglePlayback, 
    setPlaybackSpeed, 
    playbackSpeed 
  } = useAudiobook();
  
  const { notes, addNote } = useNotes();

  const handleNarratorActivate = () => {
    if (isPlaying) {
      togglePlayback();
    }
    onOpen();
  };

  const handleConversationComplete = (summary: string) => {
    addNote({
      id: Date.now().toString(),
      title: "Conversation Summary",
      content: summary,
      timestamp: currentPosition,
      categories: {
        realized: ["The 2-minute rule helps overcome procrastination"],
        learned: ["Start with just 2 minutes of any habit to build momentum"],
        implement: ["Apply to morning meditation - start with just 2 minutes"]
      }
    });
  };

  // Handle book selection from dashboard
  const handleSelectBook = (bookId: string) => {
    setSelectedBookId(bookId);
  };

  // Return to dashboard
  const handleBackToDashboard = () => {
    setSelectedBookId(null);
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
        <Divider orientation="vertical" className="mx-1" />
        <NotesPanel notes={notes} />
      </div>
      
      <div className="fixed bottom-8 right-8">
        <Button 
          size="lg" 
          color="primary" 
          className="rounded-full shadow-lg flex items-center gap-2 bg-wood-600 hover:bg-wood-700 border-none"
          onPress={handleNarratorActivate}
        >
          <Icon icon="lucide:mic" width={20} />
          Hey Narrator
        </Button>
      </div>

      <NarratorModal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange} 
        onConversationComplete={handleConversationComplete}
        book={currentBook}
      />
    </div>
  );
}
