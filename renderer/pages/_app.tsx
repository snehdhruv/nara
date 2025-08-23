import React from 'react'
import type { AppProps } from 'next/app'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'

import '../styles/globals.css'

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://astute-penguin-98.convex.cloud'
const convex = new ConvexReactClient(convexUrl)

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ConvexProvider client={convex}>
      <ConvexAuthProvider client={convex}>
        <Component {...pageProps} />
      </ConvexAuthProvider>
    </ConvexProvider>
  )
}

export default MyApp
