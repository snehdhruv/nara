# Tests Directory

This directory contains all test files organized by type and purpose.

## Directory Structure

### `/unit`
Unit tests for individual components and functions:
- `test-langgraph-nodes.ts` - Tests for LangGraph node components
- `test-dedalus-client.ts` - Tests for Dedalus client functionality
- `test-chapter-fix.ts` - Tests for chapter fixing functionality
- `test-citation-extraction.ts` - Tests for citation extraction logic

### `/integration`
Integration tests that test multiple components working together:
- `test-complete-pipeline.ts` - End-to-end pipeline tests
- `test-convex-integration.ts` - Tests for Convex database integration
- `test-real-validation.ts` - Real-world validation tests
- `test-integration.js` - Legacy integration tests
- `test-integration.ts` - TypeScript integration tests

### `/e2e`
End-to-end tests for full user workflows:
- `nara-integration.spec.ts` - Nara application integration tests
- `test-nara-modular.html` - HTML-based Nara tests

### `/voice`
Voice-related tests:
- `test-voice-matching.js` - Voice matching functionality tests
- `test-multiple-voice-clones.js` - Multiple voice cloning tests
- `test-real-voice-cloning.js` - Real voice cloning tests
- `test-voice-cloning.js` - Basic voice cloning tests
- `voice_graph.smoke.test.ts` - Voice graph smoke tests

### `/scripts`
Utility test scripts:
- `test-youtube-books.js` - YouTube book ingestion tests
- `run-tts-test.js` - Text-to-speech tests
- `delete-lean-startup.js` - Cleanup script for test data
- `test-youtube-fetch.ts` - YouTube fetching tests

### `/artifacts`
Test artifacts and outputs:
- `cloned-voice-test-dkCYrxmHaB9jHhnQBGGN.mp3` - Voice cloning test audio
- `.playwright-artifacts-*` - Playwright test artifacts

## Running Tests

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

### Voice Tests
```bash
npm run test:voice
```

### All Tests
```bash
npm run test
```

## Test Scripts

### YouTube Tests
```bash
node tests/scripts/test-youtube-books.js
node tests/scripts/run-tts-test.js
```

### Voice Tests
```bash
node tests/voice/test-voice-matching.js
node tests/voice/test-voice-cloning.js
```

## Notes

- Legacy `.js` files are kept for compatibility but should be migrated to TypeScript
- Test artifacts are automatically cleaned up after a certain period
- Integration tests may require external services to be running
- Voice tests require audio hardware and may generate temporary files
