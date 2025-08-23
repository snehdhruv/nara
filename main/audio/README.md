# Audio Module - TTS & Voice Pipeline

**Owner**: Audio Team
**Domain**: TTS synthesis, audio playback, voice activity detection, and complete audio pipeline orchestration

## 🎯 What This Module Does

This module handles the complete audio pipeline for Nara's voice interaction:

```
User speaks → VAD detects → Pause Spotify → [STT] → [LLM] → TTS → Audio playback → Resume Spotify
```

**Audio Team Responsibilities:**
- ✅ TTS synthesis (ElevenLabs integration)
- ✅ Audio playback with device routing
- ✅ Voice Activity Detection (VAD)
- ✅ Spotify/Audible pause/resume control
- ✅ Complete pipeline orchestration
- ✅ Latency optimization (<800ms pause, <3s TTS)

## 🔌 Integration Points for Other Teams

### For Auth/Spotify Team
Replace the placeholder in `../interfaces/SpotifyInterface.ts`:

```typescript
// You implement this interface
export interface SpotifyService {
  pause(): Promise<void>;
  resume(): Promise<void>;
  getPlaybackState(): Promise<SpotifyPlaybackState>;
}
```

**What you need to provide:**
- Real Spotify OAuth integration
- Playback control via Web API
- Current track/chapter information

### For LLM Team
Replace the placeholder in `../interfaces/LLMInterface.ts`:

```typescript
// You implement this interface
export interface LLMService {
  processQuestion(request: LLMRequest): Promise<LLMResponse>;
}
```

**What you need to provide:**
- Claude integration with spoiler prevention
- Context-aware responses based on book progress
- Confidence scoring for answers

## 🚀 Quick Start for Other Teams

### Testing Your Integration

```typescript
// Test if audio pipeline works with your components
import { quickDemoCheck } from './audio';

const ready = await quickDemoCheck();
if (ready) {
  console.log('✅ Audio pipeline ready for your integration');
}
```

### Using the Complete Pipeline

```typescript
import { AudioManager } from './audio';

// Initialize with your TTS config
const audioManager = new AudioManager({
  apiKey: 'your-elevenlabs-key',
  voiceId: 'your-narrator-voice-id',
  model: 'eleven_turbo_v2'
});

await audioManager.initialize();
await audioManager.startListening(); // Begins voice activation
```

## 📁 Module Structure

```
main/audio/
├── README.md              # This file
├── index.ts              # Public API exports
├── AudioManager.ts       # Main orchestrator
├── TTSService.ts         # ElevenLabs integration
├── AudioPlayer.ts        # TTS playback
├── PlaybackController.ts # Spotify/Audible control
├── VADProcessor.ts       # Voice detection
├── DeviceRouter.ts       # Audio device management
├── TTSTest.ts           # TTS validation tools
├── AudioTest.ts         # Complete pipeline tests
└── workers/
    └── vad.worker.ts    # VAD processing worker
```

## 🧪 Testing & Validation

### Before Demo Day
```bash
# Quick validation (30 seconds)
npm run audio:quick-test

# Full validation (5 minutes)
npm run audio:full-test
```

### Manual Testing
```typescript
import { testTTS, runAudioRiskValidation } from './audio';

// Test TTS integration
await testTTS('api-key', 'voice-id');

// Test complete pipeline
await runAudioRiskValidation();
```

## ⚡ Performance Targets

- **VAD → Spotify Pause**: ≤800ms
- **STT → First TTS Audio**: ≤3-4s
- **TTS End → Resume**: ≤300ms
- **Audio Quality**: -18 LUFS, no clipping

## 🔧 Configuration

### TTS Configuration
```typescript
const ttsConfig = {
  apiKey: process.env.ELEVENLABS_API_KEY,
  voiceId: process.env.NARRATOR_VOICE_ID,
  model: 'eleven_turbo_v2',        // Fastest for real-time
  stability: 0.75,                 // Voice consistency
  similarityBoost: 0.8,           // Match narrator voice
  style: 0.2                      // Minimal style variation
};
```

### Audio Device Configuration
```typescript
// Automatic feedback prevention
const deviceConfig = {
  feedbackPrevention: 'headphones', // or 'separate_outputs' or 'aec'
  microphoneDevice: 'auto',         // or specific device ID
  ttsOutput: 'auto'                 // separate from Spotify output
};
```

## 🚨 Critical Dependencies

**Required for audio pipeline:**
- ElevenLabs API key + narrator voice ID
- macOS audio tools: `afplay` (built-in)
- Spotify or Audible running with active playback

**Optional optimizations:**
- Multiple audio output devices (feedback prevention)
- External microphone (better VAD)
- Headphones (eliminates feedback risk)

## 📞 Integration Support

**Questions about audio integration?**
- Check the placeholder implementations in `../interfaces/`
- Run the test suites to validate your integration
- Audio pipeline logs show detailed timing metrics

**Common integration patterns:**
```typescript
// Replace placeholder services in AudioManager constructor
const audioManager = new AudioManager(ttsConfig);
audioManager.setLLMService(yourLLMService);      // LLM team
audioManager.setSpotifyService(yourSpotifyService); // Auth team
```

---

**Status**: 🟢 Ready for integration
**Last Updated**: Initial implementation
**Next**: TTS optimization + real service integration
