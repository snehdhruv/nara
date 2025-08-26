# Voice Tests

Voice-related functionality tests.

## Files

- `test-voice-matching.js` - Voice matching functionality tests
- `test-multiple-voice-clones.js` - Multiple voice cloning tests
- `test-real-voice-cloning.js` - Real voice cloning tests
- `test-voice-cloning.js` - Basic voice cloning tests
- `voice_graph.smoke.test.ts` - Voice graph smoke tests

## Running

```bash
npm run test:voice
```

## Prerequisites

- Audio hardware should be available
- Microphone access may be required
- Voice cloning services should be configured

## Notes

- These tests may generate audio files
- Some tests require real-time audio processing
- May take longer to run due to audio processing
- Clean up generated audio files after tests
