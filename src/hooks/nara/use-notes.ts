import React from "react";
import { Note } from "@/types/nara/note";

// Sample initial notes
const initialNotes: Note[] = [
  {
    id: "1",
    title: "Understanding Habit Formation",
    content: "We discussed how habits are formed through the four-step process: cue, craving, response, and reward.",
    timestamp: 15,
    categories: {
      realized: [
        "Habits follow a predictable pattern",
        "Small changes compound over time"
      ],
      learned: [
        "The four steps of habit formation: cue, craving, response, reward",
        "Habits are the compound interest of self-improvement"
      ],
      implement: [
        "Identify the cues that trigger my bad habits",
        "Create a habit scorecard to become aware of daily behaviors"
      ]
    }
  }
];

export const useNotes = () => {
  const [notes, setNotes] = React.useState<Note[]>(initialNotes);
  
  const addNote = (note: Note) => {
    setNotes(prev => [note, ...prev]);
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
