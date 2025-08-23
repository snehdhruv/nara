import { useState, useEffect } from 'react';

interface BookInfo {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  progress: number;
  narrator: string;
  lastPosition: number;
  duration: number;
  description?: string;
  youtubeVideoId?: string;
  totalChapters?: number;
  lastPlayedAt: number;
  currentChapter?: number;
}

interface UseCurrentReadingReturn {
  currentlyReading: BookInfo[];
  completedBooks: BookInfo[];
  loading: boolean;
  error: string | null;
  updateProgress: (bookId: string, progress: number, position: number, chapter?: number) => Promise<void>;
  markCompleted: (bookId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useCurrentReading = (): UseCurrentReadingReturn => {
  const [currentlyReading, setCurrentlyReading] = useState<BookInfo[]>([]);
  const [completedBooks, setCompletedBooks] = useState<BookInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentReading = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch currently reading books
      const currentResponse = await fetch('/api/progress?type=current');
      const currentData = await currentResponse.json();
      
      // Fetch completed books
      const completedResponse = await fetch('/api/progress?type=completed');
      const completedData = await completedResponse.json();
      
      if (currentData.success && completedData.success) {
        setCurrentlyReading(currentData.books || []);
        setCompletedBooks(completedData.books || []);
      } else {
        setError(currentData.error || completedData.error || 'Failed to fetch reading progress');
      }
    } catch (err) {
      console.error('[useCurrentReading] Fetch error:', err);
      setError('Failed to load reading progress');
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (bookId: string, progress: number, position: number, chapter?: number) => {
    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, progress, position, chapter })
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update progress');
      }
      
      // Update local state optimistically
      setCurrentlyReading(prev => prev.map(book => 
        book.id === bookId 
          ? { ...book, progress, lastPosition: position, currentChapter: chapter, lastPlayedAt: Date.now() }
          : book
      ));
      
      console.log('[useCurrentReading] Progress updated successfully:', { bookId, progress, position, chapter });
    } catch (err) {
      console.error('[useCurrentReading] Update progress error:', err);
      setError('Failed to update progress');
      // Optionally refetch to ensure consistency
      await fetchCurrentReading();
    }
  };

  const markCompleted = async (bookId: string) => {
    try {
      const response = await fetch('/api/progress/complete', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId })
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to mark as completed');
      }
      
      // Move book from currently reading to completed (optimistic update)
      const book = currentlyReading.find(b => b.id === bookId);
      if (book) {
        const completedBook = { ...book, progress: 1, lastPlayedAt: Date.now() };
        setCurrentlyReading(prev => prev.filter(b => b.id !== bookId));
        setCompletedBooks(prev => [completedBook, ...prev].slice(0, 6));
      }
      
      console.log('[useCurrentReading] Book marked as completed:', bookId);
    } catch (err) {
      console.error('[useCurrentReading] Mark completed error:', err);
      setError('Failed to mark as completed');
      // Refetch to ensure consistency
      await fetchCurrentReading();
    }
  };

  const refetch = async () => {
    await fetchCurrentReading();
  };

  useEffect(() => {
    fetchCurrentReading();
  }, []);

  return {
    currentlyReading,
    completedBooks,
    loading,
    error,
    updateProgress,
    markCompleted,
    refetch
  };
};