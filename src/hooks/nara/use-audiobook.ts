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
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  
  // YouTube player integration - key ensures re-creation when book changes
  const {
    isPlaying,
    currentTime: currentPosition,
    play,
    pause,
    seekTo: seekToTime,
    togglePlayback,
    setVolume
  } = useYouTubePlayer({
    videoId: currentBook?.youtubeVideoId,
    startTime: currentBook?.lastPosition || 0,
    onTimeUpdate: (time: number) => {
      // Update progress every 30 seconds
      if (Math.floor(time) % 30 === 0 && currentBook) {
        updateProgress(time);
      }
    }
  });

  // Load book data from API
  useEffect(() => {
    const loadBook = async () => {
      try {
        setLoading(true);
        const bookId = props?.bookId;
        if (!bookId) {
          console.log('[useAudiobook] No bookId provided, skipping load');
          setLoading(false);
          return;
        }
        const response = await fetch(`/api/books/${bookId}`);
        const data = await response.json();
        
        if (data.success) {
          console.log('[useAudiobook] Book loaded with lastPosition:', data.book.lastPosition);
          setCurrentBook(data.book);
          // YouTube player will handle initial position via startTime
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

  // Mute/unmute audiobook for voice interactions
  const muteAudiobook = () => {
    setIsAudioMuted(true);
    setVolume(0); // YouTube volume is 0-100
    console.log('[useAudiobook] Audiobook muted for voice interaction');
  };

  const unmuteAudiobook = () => {
    setIsAudioMuted(false);
    setVolume(100); // YouTube volume is 0-100
    console.log('[useAudiobook] Audiobook unmuted');
  };

  const toggleMute = () => {
    if (isAudioMuted) {
      unmuteAudiobook();
    } else {
      muteAudiobook();
    }
  };

  // Calculate current chapter based on current position
  const getCurrentChapter = () => {
    if (!currentBook || !currentBook.chapters || currentBook.chapters.length === 0) {
      return 1;
    }
    
    // Find the chapter that contains the current position
    const currentChapter = currentBook.chapters.find(chapter => 
      currentPosition >= chapter.start_s && 
      (currentPosition < chapter.end_s || chapter === currentBook.chapters[currentBook.chapters.length - 1])
    );
    
    return currentChapter ? currentChapter.idx : 1;
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
    skipToChapter,
    isAudioMuted,
    muteAudiobook,
    unmuteAudiobook,
    toggleMute,
    getCurrentChapter
  };
};
