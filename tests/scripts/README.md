# Test Scripts

Utility test scripts for various functionalities.

## Files

- `test-youtube-books.js` - YouTube book ingestion tests
- `run-tts-test.js` - Text-to-speech tests
- `delete-lean-startup.js` - Cleanup script for test data
- `test-youtube-fetch.ts` - YouTube fetching tests

## Running Individual Scripts

### YouTube Tests
```bash
node tests/scripts/test-youtube-books.js
node tests/scripts/test-youtube-fetch.ts
```

### TTS Tests
```bash
node tests/scripts/run-tts-test.js
```

### Cleanup
```bash
node tests/scripts/delete-lean-startup.js
```

## Notes

- These are standalone scripts that can be run independently
- Some may require specific environment setup
- Check individual script headers for specific requirements
- These scripts are useful for manual testing and debugging
