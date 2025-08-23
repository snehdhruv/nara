import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nara - Audiobook Chapter QA',
  description: 'Spoiler-safe chapter-scoped Q&A for audiobooks with Spotify integration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}
