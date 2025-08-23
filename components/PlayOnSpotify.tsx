'use client';

import { useState, useEffect } from "react";
import type { Chapter } from "@/lib/types";

interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

interface PlayOnSpotifyProps {
  chapter: Chapter;
}

export default function PlayOnSpotify({ chapter }: PlayOnSpotifyProps) {
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check if user has Spotify connected by trying to fetch devices
    checkSpotifyConnection();
  }, []);

  const checkSpotifyConnection = async () => {
    try {
      const response = await fetch('/api/spotify/devices');
      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
        setIsConnected(true);
      }
    } catch (error) {
      console.log('Spotify not connected');
      setIsConnected(false);
    }
  };

  const handleConnect = () => {
    window.location.href = '/api/spotify/login';
  };

  const handlePlay = async () => {
    if (!chapter.spotifyChapterUri || !selectedDevice) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/spotify/jump', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spotifyChapterUri: chapter.spotifyChapterUri,
          deviceId: selectedDevice,
          offsetMs: chapter.startMs || 0,
        }),
      });

      if (response.ok) {
        alert('Playing on Spotify! Check your selected device.');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Play error:', error);
      alert('Failed to play on Spotify');
    } finally {
      setIsLoading(false);
    }
  };

  if (!chapter.spotifyChapterUri) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-gray-600">This chapter is not available on Spotify.</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-green-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-green-900 mb-2">Play on Spotify</h3>
        <p className="text-green-700 mb-3">Connect your Spotify account to play this chapter.</p>
        <button
          onClick={handleConnect}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
        >
          Connect Spotify
        </button>
      </div>
    );
  }

  return (
    <div className="bg-green-50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-green-900 mb-3">Play on Spotify</h3>

      {devices.length > 0 ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-green-900 mb-1">
              Select Device
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full px-3 py-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500"
            >
              <option value="">Choose a device...</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} ({device.type})
                  {device.is_active ? ' - Active' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePlay}
            disabled={!selectedDevice || isLoading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Starting playback...' : 'Play Chapter on Spotify'}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-green-700 mb-3">No Spotify devices found. Make sure Spotify is open on a device.</p>
          <button
            onClick={checkSpotifyConnection}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
          >
            Refresh Devices
          </button>
        </div>
      )}
    </div>
  );
}
