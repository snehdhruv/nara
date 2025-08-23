# AI Audiobook Copilot - Playback Integration

## Spotify Connect Integration

### Device Discovery & Selection
- Query available devices via Spotify Web API
- Filter for active playback-capable devices
- Present device picker UI for user selection
- Handle device authorization and token refresh

### Chapter Playback
- Construct Spotify URI: `spotify:track:{chapterTrackId}`
- Use Web Playback SDK for local playback control
- Use Connect API for remote device control
- Implement seek(0) for chapter start positioning

### Audible Integration (Future)
- Use Audible API for device discovery
- Handle DRM-protected content playback
- Implement chapter locator mapping
- Support both mobile and desktop clients

## Ducking & Resume Flow

### Timing Sequence
1. **Voice Activity Detection**: Vapi triggers on mic input
2. **Pause Command**: Send pause to active device
3. **Wait for Pause**: Poll device state until paused
4. **TTS Playback**: Start ElevenLabs audio generation
5. **Resume Command**: Send play to device when TTS completes
6. **Timing Sync**: Account for network latency and device response times

### Edge Cases
- **Device Not Responding**: Timeout handling and fallback UI
- **Network Issues**: Retry logic with exponential backoff
- **Focus Changes**: Handle device switching mid-interaction
- **Token Expiry**: Automatic refresh and re-authentication flow

## Playback State Management

### State Tracking
- Current device ID and capabilities
- Playback position (chapter + timestamp)
- Pause/resume state and timing
- Volume levels before/after ducking

### Synchronization
- Real-time position updates from device
- Chapter boundary detection
- Automatic progress saving to Convex
- Sync across multiple user devices

## Fallback Strategies

### When Spotify Connect Unavailable
- Show manual instruction overlay
- Provide direct Spotify app links
- Graceful degradation to audio-only mode

### When Device Control Fails
- Attempt local playback via Web SDK
- Show troubleshooting UI
- Log errors for debugging but don't block user
