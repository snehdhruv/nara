import React from "react";
import { Note } from "@/types/nara/note";

// Sample initial notes
const initialNotes: Note[] = [
  {
    id: "1",
    title: "Understanding Habit Formation",
    content: "We discussed how habits are formed through the four-step process: cue, craving, response, and reward. Habits follow a predictable pattern and small changes compound over time. The key insight is that habits are the compound interest of self-improvement.",
    timestamp: 15,
    audiobookPosition: 420, // 7 minutes into the book
    topic: "Habit Formation"
  }
];

export const useNotes = () => {
  const [notes, setNotes] = React.useState<Note[]>(initialNotes);
  
  const addNote = (note: Note) => {
    setNotes(prev => [...prev, note]);
  };
  
  const removeNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };
  
  return {
    notes,
    addNote,
    removeNote
  };
};
