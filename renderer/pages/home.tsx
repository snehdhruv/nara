// TODO(home): placeholder demo page - replace with audiobook reader interface

import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import SimpleAudioTest from '../components/SimpleAudioTest'

export default function HomePage() {

  return (
    <React.Fragment>
      <Head>
        <title>Nara - AI Audiobook Assistant</title>
      </Head>

      {/* Audio Pipeline Test - Main Feature */}
      <SimpleAudioTest />

      {/* Footer Links */}
      <div className="mt-8 w-full flex-wrap flex justify-center space-x-4">
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
