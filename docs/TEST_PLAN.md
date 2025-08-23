# AI Audiobook Copilot - Test Plan

## Acceptance Criteria

### Chapter Spoiler Safety
- [ ] Chapter N answer contains no spoilers from chapters N+1 or later
- [ ] Future chapter queries yield spoiler-free answers using only safe context
- [ ] Manual chapter override correctly updates allowed context window
- [ ] Context-limited answers remain helpful and accurate for available content

### Voice Interaction Flow
- [ ] Mic activation triggers pause on active Spotify/Audible device
- [ ] TTS answer plays in narrator voice with proper ducking
- [ ] Playback resumes automatically after TTS completion
- [ ] Resume timing accounts for network latency and device response
- [ ] Voice interaction maintains <2s latency target

### Playback Integration
- [ ] Spotify Connect device list shows available playback devices
- [ ] Selected device receives "Play chapter" command correctly
- [ ] Seek(0) positions to chapter start when applicable
- [ ] Device switching mid-interaction handled gracefully
- [ ] Token expiry triggers automatic refresh/re-auth

### Edge Cases & Error Handling
- [ ] No active devices shows helpful fallback UI
- [ ] Network failures retry with exponential backoff
- [ ] Device focus changes don't break interaction flow
- [ ] Silent failures (no error messages to user)
- [ ] Graceful degradation when services unavailable

### UI/UX Requirements
- [ ] Desktop overlay remains always-on-top with minimal footprint
- [ ] Push-to-talk button reflects current voice state (muted/unmuted)
- [ ] Streaming answer display during AI processing
- [ ] Chapter picker UI prevents access to future chapters
- [ ] Spoiler-safe indicator visible when context is limited

## Performance Targets

### Latency Requirements
- Voice activation to pause: <500ms
- AI processing (Claude + context): <3s
- TTS generation: <1s per sentence
- Total interaction time: <8s
- Resume after TTS: <200ms

### Resource Usage
- Desktop app memory footprint: <200MB
- Background processing: <10% CPU
- Network requests: Minimal polling, event-driven
- Battery impact: Optimized for laptop usage

## Testing Environment

### Hardware Targets
- Demo hardware: MacBook Pro/Air, Windows 11 laptop, Linux workstation
- Target devices: iPhone, Android, Spotify Connect speakers
- Network conditions: Home WiFi, cellular, variable latency

### Test Data Setup
- Sample audiobooks with 10+ chapters
- Transcripts with varying lengths (short/long)
- Mixed content types (fiction, non-fiction, educational)
- Edge cases: Very long chapters, segmented transcripts

## Integration Testing

### Component Integration
- [ ] Electron IPC bridge handles all message types
- [ ] Convex real-time sync works across app restarts
- [ ] Vapi mic integration with desktop overlay
- [ ] Spotify OAuth flow completes successfully
- [ ] ElevenLabs TTS timing syncs with device control

### End-to-End Flows
- [ ] Complete voice interaction: Question → Pause → Answer → Resume
- [ ] Chapter navigation with progress saving
- [ ] Device switching during active playback
- [ ] Network interruption and recovery
- [ ] App restart with state preservation

## Security Testing

### Data Protection
- [ ] User progress data properly isolated by user ID
- [ ] Voice state not shared between users
- [ ] Chapter content access respects progress boundaries
- [ ] No sensitive data in client-side storage

### API Security
- [ ] Spotify tokens properly encrypted and refreshed
- [ ] Convex access rules prevent unauthorized data access
- [ ] IPC communication validated and sanitized
- [ ] External API calls use proper authentication
