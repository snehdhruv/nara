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
  const [currentTime, setCurrentTime] = useState(startTime);
  const [duration, setDuration] = useState(0);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const playerContainerId = useRef(`youtube-player-${Date.now()}`);

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
      return;
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
          setPlayer(player);
          setIsReady(true);
          setDuration(player.getDuration());
          
          // Seek to start time if specified
          if (startTime > 0) {
            player.seekTo(startTime, true);
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
            startTimeTracking();
          } else {
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
      if (player) {
        const time = player.getCurrentTime();
        setCurrentTime(time);
        
        if (onTimeUpdate) {
          onTimeUpdate(time);
        }
      }
    }, 100); // Update every 100ms for smooth synchronization
  }, [player, onTimeUpdate]);

  // Stop tracking playback time
  const stopTimeTracking = useCallback(() => {
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current);
      timeUpdateInterval.current = null;
    }
  }, []);

  // Play video
  const play = useCallback(() => {
    if (player && isReady) {
      console.log('[useYouTubePlayer] Playing');
      player.playVideo();
    }
  }, [player, isReady]);

  // Pause video
  const pause = useCallback(() => {
    if (player && isReady) {
      console.log('[useYouTubePlayer] Pausing');
      player.pauseVideo();
    }
  }, [player, isReady]);

  // Seek to specific time
  const seekTo = useCallback((time: number) => {
    if (player && isReady) {
      console.log('[useYouTubePlayer] Seeking to:', time);
      player.seekTo(time, true);
      setCurrentTime(time);
    }
  }, [player, isReady]);

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
    if (player && isReady) {
      player.mute();
    }
  }, [player, isReady]);

  const unmute = useCallback(() => {
    if (player && isReady) {
      player.unMute();
    }
  }, [player, isReady]);

  // Set volume (0-100)
  const setVolume = useCallback((volume: number) => {
    if (player && isReady) {
      player.setVolume(Math.max(0, Math.min(100, volume)));
    }
  }, [player, isReady]);

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
  }, [videoId, initializePlayer, stopTimeTracking]);

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