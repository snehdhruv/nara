import { useCallback, useRef, useEffect } from 'react';
import { useCurrentReading } from './use-current-reading';

interface UseAutoSaveProgressProps {
  bookId: string;
  duration: number; // Total book duration in seconds
  isPlaying: boolean;
}

interface UseAutoSaveProgressReturn {
  saveProgress: (currentPosition: number, currentChapter?: number) => void;
  saveProgressImmediate: (currentPosition: number, currentChapter?: number) => Promise<void>;
}

export const useAutoSaveProgress = ({
  bookId,
  duration,
  isPlaying
}: UseAutoSaveProgressProps): UseAutoSaveProgressReturn => {
  const { updateProgress } = useCurrentReading();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedPositionRef = useRef<number>(0);
  const lastSavedTimeRef = useRef<number>(0);

  const SAVE_INTERVAL_MS = 5000; // Save every 5 seconds
  const MIN_POSITION_CHANGE = 2; // Only save if position changed by at least 2 seconds

  const saveProgressImmediate = useCallback(async (currentPosition: number, currentChapter?: number) => {
    try {
      const progress = Math.min(currentPosition / duration, 1); // Ensure progress doesn't exceed 1
      
      console.log('[AutoSave] Saving progress:', {
        bookId,
        currentPosition: Math.floor(currentPosition),
        progress: Math.round(progress * 100) / 100,
        chapter: currentChapter
      });

      await updateProgress(bookId, progress, currentPosition, currentChapter);
      lastSavedPositionRef.current = currentPosition;
      lastSavedTimeRef.current = Date.now();
    } catch (error) {
      console.error('[AutoSave] Failed to save progress:', error);
    }
  }, [bookId, duration, updateProgress]);

  const saveProgress = useCallback((currentPosition: number, currentChapter?: number) => {
    const now = Date.now();
    const timeSinceLastSave = now - lastSavedTimeRef.current;
    const positionChange = Math.abs(currentPosition - lastSavedPositionRef.current);

    // Only save if enough time has passed or position changed significantly
    const shouldSave = 
      timeSinceLastSave >= SAVE_INTERVAL_MS || 
      positionChange >= MIN_POSITION_CHANGE;

    if (!shouldSave) return;

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save operation
    saveTimeoutRef.current = setTimeout(() => {
      saveProgressImmediate(currentPosition, currentChapter);
    }, 1000); // Wait 1 second after the last call

  }, [saveProgressImmediate]);

  // Auto-save when playback stops
  useEffect(() => {
    if (!isPlaying && saveTimeoutRef.current) {
      // If playback stopped, immediately execute any pending save
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, [isPlaying]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    saveProgress,
    saveProgressImmediate
  };
};