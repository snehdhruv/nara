import { SpotifyPlaybackTracker } from "@/components/spotify-playback-tracker";
import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";
import { RedirectButton } from "./RedirectButton";

export default function HomePage() {

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Nara - Music Discovery</h1>
      
      <SignedOut>
        <div className="space-y-4">
          <p>Connect your Spotify account to get started:</p>
          <RedirectButton/>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="space-y-6">
          <SpotifyPlaybackTracker />
          
          <div className="text-sm text-gray-500">
            <p>This will show your current Spotify playback in real-time.</p>
            <p>Play something on Spotify to see it here!</p>
          </div>
        </div>
      </SignedIn>
    </div>
  );
}
