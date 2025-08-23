// TODO(home): placeholder demo page - replace with audiobook reader interface

import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

export default function HomePage() {
  const [newMessage, setNewMessage] = useState('')
  const [authorName, setAuthorName] = useState('Anonymous')

  // Use Convex hooks to interact with the backend
  const greeting = useQuery(api.messages.getGreeting, { name: "Nextron User" })
  const messages = useQuery(api.messages.getMessages)
  const sendMessage = useMutation(api.messages.sendMessage)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim()) {
      await sendMessage({
        author: authorName || 'Anonymous',
        body: newMessage
      })
      setNewMessage('')
    }
  }

  return (
    <React.Fragment>
      <Head>
        <title>Home - Nextron with Convex</title>
      </Head>
      <div className="grid grid-col-1 text-2xl w-full text-center">
        <div>
          <Image
            className="ml-auto mr-auto"
            src="/images/logo.png"
            alt="Logo image"
            width={256}
            height={256}
          />
        </div>
        <span>⚡ Electron ⚡</span>
        <span>+</span>
        <span>Next.js</span>
        <span>+</span>
        <span>Convex</span>
        <span>+</span>
        <span>tailwindcss</span>
        <span>=</span>
        <span>💕 </span>
      </div>

      {/* Convex Demo Section */}
      <div className="mt-8 mx-auto max-w-2xl p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-center">🔥 Convex Demo</h2>
        
        {/* Greeting from Convex */}
        <div className="mb-4 p-3 bg-blue-100 rounded">
          <p className="text-sm text-blue-800">
            {greeting || "Loading greeting from Convex..."}
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
              className="w-full p-2 border rounded text-sm"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 p-2 border rounded text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Send
            </button>
          </div>
        </form>

        {/* Messages List */}
        <div className="max-h-64 overflow-y-auto">
          <h3 className="text-sm font-semibold mb-2">Messages:</h3>
          {messages === undefined ? (
            <p className="text-sm text-gray-500">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages yet. Send one above!</p>
          ) : (
            <div className="space-y-2">
              {messages.map((message: any) => (
                <div key={message._id} className="p-2 bg-white rounded shadow-sm">
                  <div className="text-xs text-gray-600">
                    <strong>{message.author}</strong> • {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="text-sm mt-1">{message.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 w-full flex-wrap flex justify-center">
        <Link href="/next">Go to next page</Link>
      </div>
    </React.Fragment>
  )
}
