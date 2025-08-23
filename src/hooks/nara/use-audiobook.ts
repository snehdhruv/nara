import React, { useState, useEffect } from "react";
import { Book } from "@/types/nara/book";
import { useYouTubePlayer } from "./use-youtube-player";

interface UseAudiobookProps {
  bookId?: string;
}

export const useAudiobook = (props?: UseAudiobookProps) => {
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // YouTube player integration
  const {
    isPlaying,
    currentTime: currentPosition,
    play,
    pause,
    seekTo: seekToTime,
    togglePlayback
  } = useYouTubePlayer({
    videoId: currentBook?.youtubeVideoId,
    startTime: currentBook?.lastPosition || 0,
    onTimeUpdate: (time: number) => {
      // Update progress every 30 seconds
      if (Math.floor(time) % 30 === 0) {
        updateProgress(time);
      }
    }
  });

  // Load book data from API
  useEffect(() => {
    const loadBook = async () => {
      try {
        setLoading(true);
        const bookId = props?.bookId || 'zero-to-one';
        const response = await fetch(`/api/books/${bookId}`);
        const data = await response.json();
        
        if (data.success) {
          setCurrentBook(data.book);
          setCurrentPosition(data.book.lastPosition || 0);
        } else {
          setError(data.error || 'Failed to load book');
        }
      } catch (err) {
        console.error('[useAudiobook] Load error:', err);
        setError('Failed to load audiobook data');
      } finally {
        setLoading(false);
      }
    };

    loadBook();
  }, [props?.bookId]);

  // Update progress on the server
  const updateProgress = async (newPosition: number) => {
    if (!currentBook) return;
    
    try {
      const progress = newPosition / currentBook.duration;
      await fetch(`/api/books/${currentBook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastPosition: newPosition,
          progress: progress
        })
      });
    } catch (err) {
      console.error('[useAudiobook] Progress update failed:', err);
    }
  };

  const seekTo = (position: number) => {
    if (currentBook) {
      const clampedPosition = Math.max(0, Math.min(currentBook.duration, position));
      seekToTime(clampedPosition);
      updateProgress(clampedPosition);
    }
  };

  const skipToChapter = (chapterIdx: number) => {
    if (currentBook && currentBook.chapters) {
      const chapter = currentBook.chapters.find(ch => ch.idx === chapterIdx);
      if (chapter) {
        seekTo(chapter.start_s);
      }
    }
  };
  
  return {
    currentBook,
    isPlaying,
    currentPosition,
    togglePlayback,
    play,
    pause,
    playbackSpeed,
    setPlaybackSpeed,
    loading,
    error,
    seekTo,
    skipToChapter
  };
};
