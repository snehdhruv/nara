import { useState, useEffect, useRef, useCallback } from 'react';

interface YouTubePlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getPlayerState: () => number;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
}

interface UseYouTubePlayerProps {
  videoId?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onStateChange?: (state: number) => void;
  startTime?: number;
}

export const useYouTubePlayer = ({
  videoId,
  onTimeUpdate,
  onStateChange,
  startTime = 0
}: UseYouTubePlayerProps) => {
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const playerContainerId = useRef(`youtube-player-${Date.now()}`);
  const queuedPlayAction = useRef<'play' | 'pause' | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const startTimeRef = useRef(startTime);
  const hasInitializedPosition = useRef(false);

  // YouTube Player States
  const PLAYER_STATES = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5
  };

  // Initialize YouTube player
  const initializePlayer = useCallback(() => {
    if (!videoId || !window.YT || !window.YT.Player) {
      console.log('[useYouTubePlayer] Missing requirements:', { videoId, YT: !!window.YT, Player: !!(window.YT && window.YT.Player) });
      return;
    }

    // Clean up existing player instance
    if (playerRef.current) {
      console.log('[useYouTubePlayer] Cleaning up existing player before creating new one');
      try {
        playerRef.current.destroy();
      } catch (error) {
        console.warn('[useYouTubePlayer] Error destroying player:', error);
      }
      playerRef.current = null;
      setIsReady(false);
    }

    // Create container div if it doesn't exist
    if (!document.getElementById(playerContainerId.current)) {
      const container = document.createElement('div');
      container.id = playerContainerId.current;
      container.style.display = 'none';
      document.body.appendChild(container);
    }

    console.log('[useYouTubePlayer] Initializing player for:', videoId);
    
    // @ts-ignore - YouTube API global
    const ytPlayer = new window.YT.Player(playerContainerId.current, {
      height: '0',
      width: '0',
      videoId: videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        enablejsapi: 1,
        origin: window.location.origin
      },
      events: {
        onReady: (event: any) => {
          console.log('[useYouTubePlayer] Player ready');
          const player = event.target;
          playerRef.current = player;
          setPlayer(player);
          setIsReady(true);
          
          // Get duration and log it
          const videoDuration = player.getDuration();
          console.log('[useYouTubePlayer] Video duration:', videoDuration);
          setDuration(videoDuration);
          
          // Seek to start time if specified and not already initialized
          const targetStartTime = startTimeRef.current;
          if (targetStartTime > 0 && !hasInitializedPosition.current) {
            console.log('[useYouTubePlayer] Seeking to start time:', targetStartTime);
            player.seekTo(targetStartTime, true);
            setCurrentTime(targetStartTime);
            hasInitializedPosition.current = true;
          }
          
          // Execute any queued play action
          if (queuedPlayAction.current === 'play') {
            console.log('[useYouTubePlayer] Executing queued play action');
            player.playVideo();
            queuedPlayAction.current = null;
          } else if (queuedPlayAction.current === 'pause') {
            console.log('[useYouTubePlayer] Executing queued pause action');
            player.pauseVideo();
            queuedPlayAction.current = null;
          }
        },
        onStateChange: (event: any) => {
          const state = event.data;
          console.log('[useYouTubePlayer] State change:', state);
          
          setIsPlaying(state === PLAYER_STATES.PLAYING);
          
          if (onStateChange) {
            onStateChange(state);
          }
          
          // Start or stop time tracking based on state
          if (state === PLAYER_STATES.PLAYING) {
            console.log('[useYouTubePlayer] Starting time tracking for PLAYING state');
            startTimeTracking();
          } else {
            console.log('[useYouTubePlayer] Stopping time tracking for state:', state);
            stopTimeTracking();
          }
        }
      }
    });
  }, [videoId, startTime, onStateChange]);

  // Start tracking playback time
  const startTimeTracking = useCallback(() => {
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current);
    }

    timeUpdateInterval.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        try {
          const time = playerRef.current.getCurrentTime();
          
          // Update every 250ms for smooth word highlighting, but only log every second
          setCurrentTime(prevTime => {
            const timeDiff = Math.abs(time - prevTime);
            if (timeDiff >= 0.2) { // Update if difference is 200ms or more
              const roundedTime = Math.floor(time);
              const prevRounded = Math.floor(prevTime);
              
              // Log every second to avoid console spam
              if (roundedTime !== prevRounded) {
                console.log('[useYouTubePlayer] Time update:', time);
              }
              
              if (onTimeUpdate) {
                onTimeUpdate(time);
              }
              
              return time;
            }
            return prevTime;
          });
        } catch (error) {
          console.error('[useYouTubePlayer] Error getting current time:', error);
        }
      }
    }, 250); // Update every 250ms for smooth word highlighting
  }, [onTimeUpdate]);

  // Stop tracking playback time
  const stopTimeTracking = useCallback(() => {
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current);
      timeUpdateInterval.current = null;
    }
  }, []);

  // Play video
  const play = useCallback(() => {
    console.log('[useYouTubePlayer] Play called. Player:', !!playerRef.current, 'Ready:', isReady);
    if (playerRef.current && isReady) {
      console.log('[useYouTubePlayer] Calling playVideo()');
      playerRef.current.playVideo();
      
      // Log player state after calling play
      setTimeout(() => {
        if (playerRef.current && playerRef.current.getPlayerState) {
          const state = playerRef.current.getPlayerState();
          console.log('[useYouTubePlayer] Player state after play:', state);
        }
      }, 100);
    } else {
      console.log('[useYouTubePlayer] Queueing play action for when player is ready');
      queuedPlayAction.current = 'play';
    }
  }, [isReady]);

  // Pause video
  const pause = useCallback(() => {
    if (playerRef.current && isReady) {
      console.log('[useYouTubePlayer] Pausing');
      playerRef.current.pauseVideo();
    }
  }, [isReady]);

  // Seek to specific time
  const seekTo = useCallback((time: number) => {
    if (playerRef.current && isReady) {
      console.log('[useYouTubePlayer] Seeking to:', time);
      playerRef.current.seekTo(time, true);
      setCurrentTime(time);
    }
  }, [isReady]);

  // Toggle playback
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Mute/unmute
  const mute = useCallback(() => {
    if (playerRef.current && isReady) {
      playerRef.current.mute();
    }
  }, [isReady]);

  const unmute = useCallback(() => {
    if (playerRef.current && isReady) {
      playerRef.current.unMute();
    }
  }, [isReady]);

  // Set volume (0-100)
  const setVolume = useCallback((volume: number) => {
    if (playerRef.current && isReady) {
      playerRef.current.setVolume(Math.max(0, Math.min(100, volume)));
    }
  }, [isReady]);

  // Initialize player when YouTube API is ready
  useEffect(() => {
    let isApiReady = false;

    const checkAndInitialize = () => {
      if (window.YT && window.YT.Player) {
        isApiReady = true;
        initializePlayer();
      }
    };

    // Check if API is already loaded
    checkAndInitialize();

    // If not loaded, wait for it
    if (!isApiReady) {
      const originalCallback = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (originalCallback) originalCallback();
        checkAndInitialize();
      };
    }

    return () => {
      stopTimeTracking();
    };
  }, [videoId, startTime, initializePlayer, stopTimeTracking]);

  // Update startTimeRef when startTime prop changes
  useEffect(() => {
    startTimeRef.current = startTime;
    
    // Always set currentTime to startTime immediately for display
    if (startTime > 0) {
      console.log('[useYouTubePlayer] Setting currentTime to startTime:', startTime);
      setCurrentTime(startTime);
    }
    
    // If player is ready and we haven't initialized position yet, seek now
    if (playerRef.current && isReady && startTime > 0 && !hasInitializedPosition.current) {
      console.log('[useYouTubePlayer] Late startTime update, seeking to:', startTime);
      playerRef.current.seekTo(startTime, true);
      hasInitializedPosition.current = true;
    }
  }, [startTime, isReady]);

  // Reset initialization flag when videoId changes
  useEffect(() => {
    hasInitializedPosition.current = false;
  }, [videoId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimeTracking();
      
      // Remove player container
      const container = document.getElementById(playerContainerId.current);
      if (container) {
        container.remove();
      }
    };
  }, [stopTimeTracking]);

  return {
    player,
    isReady,
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    seekTo,
    togglePlayback,
    mute,
    unmute,
    setVolume
  };
};