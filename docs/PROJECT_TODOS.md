# AI Audiobook Copilot - Master Checklist

## QA Orchestration (LangGraph)
- [ ] ProgressGate: Read user progress; cap allowed chapter to current
- [ ] ChapterLoader: Load transcript (text/segments) for active chapter; optional prior summaries (short)
- [ ] BudgetPlanner: Choose full | compressed | focused (in-chapter only)
- [ ] FocusedSelector: Select paragraphs within chapter by keywords + neighbors
- [ ] Compressor: Compress long chapter while preserving key entities/events
- [ ] ContextPacker: Build spoiler-safe system + messages
- [ ] Answerer: Call Claude 4.1; return text (+ optional paragraph/timestamp refs)
- [ ] PostProcess: Build playback hints (chapter URI; offset if aligned)
- [ ] Silent spoiler gating: Never show refusal; answers limited by context

## Playback Attach (Desktop Overlay)
- [ ] Device/session attach for Spotify/Audible
- [ ] Pause/duck → TTS → resume flow
- [ ] Fallback notes for edge cases
- [ ] Device list → pick → play spotify:chapter:* (or Audible locator)
- [ ] Seek(0) when applicable
- [ ] Ducking + resume timing with Vapi/ElevenLabs
- [ ] Handle device not active, focus changed, token expiry

## Data & Progress (Convex)
- [ ] audiobooks table: (_id, title, language)
- [ ] chapters table: (audiobookId, idx, title, spotifyChapterUri?, audibleLocator?, startMs?, endMs?)
- [ ] chapterTranscripts table: (audiobookId, idx, text | segments[{startMs,endMs,text}])
- [ ] userProgress table: (userId, audiobookId, currentIdx, completed[])
- [ ] voiceState table: (userId, muted: boolean)
- [ ] userMemory table: (userId, blobRef/meta) (optional)
- [ ] API functions: get/set currentIdx; manual override
- [ ] API functions: get chapter transcript (text or segments); optional cached summaries
- [ ] API functions: list devices + play chapter on selected device

## Infrastructure Setup
- [ ] Electron main process: BrowserWindow; load Next; single-instance + external links
- [ ] IPC contracts: qa:ask, playback:devices, playback:playChapter, voice:state
- [ ] Spotify OAuth PKCE (system browser) + token store
- [ ] Custom scheme handler (nara://spotify-auth)
- [ ] Minimal menu/devtools toggle

## UI Components
- [ ] QABox: Submit question via IPC/API; show streaming answer
- [ ] PlayOnSpotify: Device picker + play chapter; seek(0) when applicable
- [ ] ChapterPicker: Manual chapter selection; writes progress
- [ ] SpoilerNotice: Small "spoiler-safe" indicator
- [ ] OverlayMicButton: Push-to-talk; reflect voiceState (muted/unmuted)

## Voice & AI Integration
- [ ] Vapi mic capture start/stop hooks for desktop
- [ ] ElevenLabs TTS call; handle duck/resume timing
- [ ] Claude stable interface for chapter-scoped calls; model + safety margins
- [ ] Spoiler-safe system template; cite para IDs/timestamps if available
- [ ] Chapter packing: choose full | focused | compressed; assemble Claude messages
