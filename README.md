# Nara - Audiobook Chapter QA with Spoiler Protection

A Next.js application that provides spoiler-safe chapter-scoped Q&A for audiobooks using LangGraph orchestration, with Spotify integration and BetterAuth authentication.

## Features

- **Chapter-scoped QA**: Ask questions about specific audiobook chapters without spoilers from future content
- **Spotify Integration**: Jump to specific chapters in Spotify audiobooks
- **Admin Bulk Ingest**: Upload chapter maps and transcripts for new audiobooks
- **Authentication**: Email/password or magic link login via BetterAuth
- **Spoiler Protection**: LangGraph nodes prevent access to future chapter content

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, TailwindCSS
- **Backend**: Convex (database + server functions)
- **Authentication**: BetterAuth
- **AI Orchestration**: LangGraph with Anthropic Claude
- **Validation**: Zod
- **Spotify Integration**: OAuth PKCE flow

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Fill in your API keys and configuration
   ```

3. Start the development servers:
   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `.env.example` for required configuration including:
- Spotify OAuth credentials
- Anthropic API key
- BetterAuth configuration
- Convex deployment settings

## Project Structure

- `/app` - Next.js app router pages
- `/components` - React components
- `/lib` - Utility functions and types
- `/agents` - LangGraph orchestration
- `/convex` - Convex database schema and functions
