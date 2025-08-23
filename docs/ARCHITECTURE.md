# AI Audiobook Copilot - Architecture Overview

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Electron      │    │   Next.js       │    │   LangGraph     │
│   (Desktop)     │◄──►│   (Renderer)    │◄──►│   (Agents)      │
│                 │    │                 │    │                 │
│ • Main Process  │    │ • React UI      │    │ • ProgressGate  │
│ • IPC Bridge    │    │ • Components    │    │ • ChapterLoader │
│ • OAuth/Scheme  │    │ • State Mgmt    │    │ • Answerer      │
│ • Spotify API   │    │ • Vapi Mic     │    │ • PostProcess   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │     Convex      │              │
         │              │   (Data/State)  │◄─────────────┘
         │              │                 │
         │              │ • Audiobooks    │
         │              │ • Chapters      │
         │              │ • Transcripts   │
         │              │ • User Progress │
         │              │ • Voice State   │
         │              └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│    Spotify      │    │   ElevenLabs    │
│   Connect API   │    │     (TTS)       │
│                 │    │                 │
│ • Playback      │    │ • Voice Gen     │
│ • Device Ctrl   │    │ • Timing        │
└─────────────────┘    └─────────────────┘
```

## Data Flow

1. **Voice Input**: Vapi captures mic → IPC → LangGraph agents
2. **Context Loading**: ProgressGate → ChapterLoader → BudgetPlanner
3. **AI Processing**: ContextPacker → Claude 4.1 → PostProcess
4. **Voice Output**: ElevenLabs TTS with duck/resume timing
5. **Playback Control**: Spotify Connect API for pause/resume

## Key Constraints

- **Spoiler Safety**: All answers limited to current/earlier chapters only
- **Silent Failures**: No user-visible refusals or error messages
- **Real-time**: Sub-2s latency target for voice interactions
- **Desktop Overlay**: Always-on-top UI with minimal footprint

## Component Responsibilities

- **Electron Main**: Window lifecycle, OAuth, IPC routing, external links
- **Preload Bridge**: Typed IPC surface, security boundary
- **Next.js Renderer**: UI components, state management, Vapi integration
- **LangGraph Agents**: AI orchestration, spoiler gating, context packing
- **Convex Backend**: Data persistence, real-time sync, API functions
- **Third-party APIs**: Spotify Connect, ElevenLabs TTS, Claude 4.1
