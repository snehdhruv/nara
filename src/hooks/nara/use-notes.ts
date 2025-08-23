import { useState, useEffect } from "react";
import { Note } from "@/types/nara/note";

interface UseNotesProps {
  bookId?: string;
}

export const useNotes = (props?: UseNotesProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load notes from API
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        const bookId = props?.bookId || 'zero-to-one';
        const response = await fetch(`/api/notes?bookId=${bookId}`);
        const data = await response.json();
        
        if (data.success) {
          setNotes(data.notes);
        } else {
          setError(data.error || 'Failed to fetch notes');
        }
      } catch (err) {
        console.error('[useNotes] Fetch error:', err);
        setError('Failed to load notes');
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [props?.bookId]);

  const addNote = (note: Note) => {
    setNotes(prev => [...prev, note]);
  };
  
  const removeNote = async (id: string) => {
    try {
      const response = await fetch(`/api/notes?id=${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        setNotes(prev => prev.filter(note => note.id !== id));
      } else {
        console.error('[useNotes] Delete failed:', data.error);
      }
    } catch (err) {
      console.error('[useNotes] Delete error:', err);
    }
  };

  const refreshNotes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const bookId = props?.bookId || 'zero-to-one';
      const response = await fetch(`/api/notes?bookId=${bookId}`);
      const data = await response.json();
      
      if (data.success) {
        setNotes(data.notes);
      } else {
        setError(data.error || 'Failed to refresh notes');
      }
    } catch (err) {
      console.error('[useNotes] Refresh error:', err);
      setError('Failed to refresh notes');
    } finally {
      setLoading(false);
    }
  };
  
  return {
    notes,
    addNote,
    removeNote,
    loading,
    error,
    refreshNotes
  };
};
