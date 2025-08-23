"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useRef } from "react";

export function SpotifyPlaybackTracker() {
  const playbackState = useQuery(api.spotify.getUserPlaybackState);
  const getCurrentPlayback = useAction(api.spotify.getCurrentPlayback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll Spotify API every 5 seconds for real-time updates
  useEffect(() => {
    const pollPlayback = async () => {
      try {
        await getCurrentPlayback();
      } catch (error) {
        console.error("Error polling playback:", error);
      }
    };

    // Initial fetch
    pollPlayback();

    // Set up polling interval
    intervalRef.current = setInterval(pollPlayback, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [getCurrentPlayback]);

  if (!playbackState) {
    return (
      <div className="p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Spotify Playback</h3>
        <p className="text-gray-500">No active playback or not connected to Spotify</p>
      </div>
    );
  }

  const { track, isPlaying, progressMs, device, lastUpdated } = playbackState;
  const lastUpdatedAgo = Math.floor((Date.now() - lastUpdated) / 1000);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Spotify Playback</h3>
      
      {track && (
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            {track.imageUrl && (
              <img 
                src={track.imageUrl} 
                alt={track.album} 
                className="w-16 h-16 rounded"
              />
            )}
            <div>
              <h4 className="font-medium">{track.name}</h4>
              <p className="text-sm text-gray-600">{track.artist}</p>
              <p className="text-xs text-gray-500">{track.album}</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{formatTime(progressMs || 0)}</span>
              <span>{formatTime(track.durationMs)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                style={{ 
                  width: `${((progressMs || 0) / track.durationMs) * 100}%` 
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span>{isPlaying ? 'Playing' : 'Paused'}</span>
            </div>
            {device && (
              <span className="text-gray-500">
                {device.name} ({device.type})
              </span>
            )}
          </div>

          <div className="text-xs text-gray-400">
            Last updated: {lastUpdatedAgo}s ago
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
