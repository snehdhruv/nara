// TODO(home): placeholder demo page - replace with audiobook reader interface

import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
// import { useQuery, useMutation } from 'convex/react'
// import { useAuthActions } from '@convex-dev/auth/react'
// import { api } from '../../convex/_generated/api'
import AudioStatus from '../components/AudioStatus'

export default function HomePage() {
  const [newMessage, setNewMessage] = useState('')
  const [authorName, setAuthorName] = useState('Anonymous')

  // Temporarily disabled Convex integration for audio testing
  // Auth hooks
  // const { signIn, signOut } = useAuthActions()
  // const currentUser = useQuery(api.users.currentUser)

  // Use Convex hooks to interact with the backend
  // const greeting = useQuery(api.messages.getGreeting, { name: "Nextron User" })
  // const messages = useQuery(api.messages.getMessages)
  // const sendMessage = useMutation(api.messages.sendMessage)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Message sending temporarily disabled for audio testing')
  }

  const handleSpotifyLogin = () => {
    console.log('Spotify login temporarily disabled for audio testing')
  }

  const handleLogout = () => {
    console.log('Logout temporarily disabled for audio testing')
  }

  return (
    <React.Fragment>
      <Head>
        <title>Nara - AI Audiobook Assistant</title>
      </Head>

      {/* Audio Pipeline Status - Main Feature */}
      <AudioStatus />

      <div className="mt-8 grid grid-col-1 text-xl w-full text-center max-w-2xl mx-auto">
        <div>
          <Image
            className="ml-auto mr-auto"
            src="/images/logo.png"
            alt="Logo image"
            width={128}
            height={128}
          />
        </div>
        <span>🎯 Nara Audio Pipeline</span>
        <span>+</span>
        <span>⚡ Electron</span>
        <span>+</span>
        <span>🎵 Spotify</span>
        <span>+</span>
        <span>🗣️ Vapi + ElevenLabs</span>
        <span>=</span>
        <span>🎧 Smart Audiobook Assistant</span>
      </div>

      {/* Authentication Section - Temporarily Disabled */}
      <div className="mt-8 mx-auto max-w-2xl p-6 bg-purple-50 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-center">🎵 Spotify Authentication</h2>
        <div className="text-center">
          <p className="text-gray-600 mb-4">Authentication temporarily disabled for audio pipeline testing</p>
          <button
            onClick={handleSpotifyLogin}
            disabled
            className="bg-gray-400 text-white font-bold py-2 px-4 rounded cursor-not-allowed"
          >
            🎵 Sign in with Spotify (Disabled)
          </button>
          <p className="text-xs text-gray-500 mt-2">Will be re-enabled once Convex is running</p>
        </div>
      </div>

      {/* Convex Demo Section - Temporarily Disabled */}
      <div className="mt-8 mx-auto max-w-2xl p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-center">🔥 Convex Demo</h2>

        {/* Greeting from Convex */}
        <div className="mb-4 p-3 bg-blue-100 rounded">
          <p className="text-sm text-blue-800">
            Convex integration temporarily disabled for audio pipeline testing
          </p>
        </div>

        {/* Message Form */}
        <form onSubmit={handleSendMessage} className="mb-4">
          <div className="mb-2">
            <input
              type="text"
              placeholder="Your name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              disabled
              className="w-full p-2 border rounded text-sm bg-gray-100"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled
              className="flex-1 p-2 border rounded text-sm bg-gray-100"
            />
            <button
              type="submit"
              disabled
              className="px-4 py-2 bg-gray-400 text-white rounded text-sm cursor-not-allowed"
            >
              Send (Disabled)
            </button>
          </div>
        </form>

        {/* Messages List */}
        <div className="max-h-64 overflow-y-auto">
          <h3 className="text-sm font-semibold mb-2">Messages:</h3>
          <p className="text-sm text-gray-500">Convex messaging disabled for audio testing. Focus on audio pipeline above.</p>
        </div>
      </div>

      <div className="mt-4 w-full flex-wrap flex justify-center space-x-4">
        <Link href="/next" className="text-blue-500 hover:text-blue-600 underline">
          Go to next page
        </Link>
        <Link href="/spotify" className="text-green-500 hover:text-green-600 underline">
          🎵 Spotify Integration
        </Link>
      </div>
    </React.Fragment>
  )
}
