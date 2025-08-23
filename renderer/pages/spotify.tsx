import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

export default function SpotifyPage() {
  const { signIn, signOut } = useAuthActions()
  const currentUser = useQuery(api.users.currentUser)
  const playlists = useQuery(api.users.getUserPlaylists)
  const favoriteTracks = useQuery(api.users.getFavoriteTracks)
  const saveFavoriteTrack = useMutation(api.users.saveFavoriteTrack)

  const handleSpotifyLogin = () => {
    void signIn("spotify")
  }

  const handleLogout = () => {
    void signOut()
  }

  const handleAddToFavorites = async (trackId: string, trackName: string, artist: string) => {
    try {
      await saveFavoriteTrack({ trackId, trackName, artist })
    } catch (error) {
      console.error("Failed to add to favorites:", error)
    }
  }

  // Mock track data for demonstration
  const mockTracks = [
    { id: "1", name: "Bohemian Rhapsody", artist: "Queen" },
    { id: "2", name: "Hotel California", artist: "Eagles" },
    { id: "3", name: "Imagine", artist: "John Lennon" },
  ]

  return (
    <React.Fragment>
      <Head>
        <title>Spotify Integration - Nextron with Convex</title>
      </Head>
      
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center mb-8">
          🎵 Spotify Integration
        </h1>

        {!currentUser ? (
          <div className="text-center">
            <div className="bg-gray-100 p-8 rounded-lg mb-6">
              <h2 className="text-xl font-semibold mb-4">Connect with Spotify</h2>
              <p className="text-gray-600 mb-6">
                Sign in with your Spotify account to access your playlists and save favorite tracks.
              </p>
              <button
                onClick={handleSpotifyLogin}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full transition-colors"
              >
                🎵 Sign in with Spotify
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* User Info */}
            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {currentUser.image && (
                    <img 
                      src={currentUser.image} 
                      alt="Profile" 
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-semibold">Welcome, {currentUser.name || 'Spotify User'}!</p>
                    <p className="text-sm text-gray-600">{currentUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* Playlists Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Your Playlists</h2>
              {playlists ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playlists.map((playlist: any) => (
                    <div key={playlist.id} className="bg-white p-4 rounded-lg shadow border">
                      <img 
                        src={playlist.image} 
                        alt={playlist.name}
                        className="w-full h-32 object-cover rounded mb-3"
                      />
                      <h3 className="font-semibold text-lg">{playlist.name}</h3>
                      <p className="text-gray-600 text-sm mb-2">{playlist.description}</p>
                      <p className="text-green-600 text-sm font-medium">
                        {playlist.track_count} tracks
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Loading playlists...</p>
              )}
            </div>

            {/* Sample Tracks to Add to Favorites */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Popular Tracks</h2>
              <div className="bg-white rounded-lg shadow border">
                {mockTracks.map((track) => (
                  <div key={track.id} className="flex items-center justify-between p-4 border-b last:border-b-0">
                    <div>
                      <h3 className="font-semibold">{track.name}</h3>
                      <p className="text-gray-600">{track.artist}</p>
                    </div>
                    <button
                      onClick={() => handleAddToFavorites(track.id, track.name, track.artist)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      ❤️ Add to Favorites
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Favorite Tracks */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Your Favorite Tracks</h2>
              {favoriteTracks ? (
                favoriteTracks.length === 0 ? (
                  <p className="text-gray-500">No favorite tracks yet. Add some from the popular tracks above!</p>
                ) : (
                  <div className="bg-white rounded-lg shadow border">
                    {favoriteTracks.map((track: any) => (
                      <div key={track._id} className="flex items-center justify-between p-4 border-b last:border-b-0">
                        <div>
                          <h3 className="font-semibold">{track.trackName}</h3>
                          <p className="text-gray-600">{track.artist}</p>
                          <p className="text-xs text-gray-400">
                            Added {new Date(track.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-red-500">❤️</span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-gray-500">Loading favorite tracks...</p>
              )}
            </div>
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/home" className="text-blue-500 hover:text-blue-600 underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </React.Fragment>
  )
}
