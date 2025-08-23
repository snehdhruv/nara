"use client"
import { SpotifyPlaybackTracker } from "@/components/spotify-playback-tracker";
import { Authenticated, Unauthenticated } from "convex/react";
import { authClient } from "@/lib/auth-client";

export default function HomePage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Nara - Music Discovery</h1>
      
      <Unauthenticated>
        <div className="space-y-4">
          <p>Connect your Spotify account to get started:</p>
          <button
            onClick={() => authClient.signIn.social({ provider: "spotify" })}
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
          >
            Connect Spotify
          </button>
        </div>
      </Unauthenticated>

      <Authenticated>
        <div className="space-y-6">
          <SpotifyPlaybackTracker />
          
          <div className="text-sm text-gray-500">
            <p>This will show your current Spotify playback in real-time.</p>
            <p>Play something on Spotify to see it here!</p>
          </div>
        </div>
      </Authenticated>
    </div>
  );
}
