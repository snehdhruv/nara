# Spotify Podcast Ingest Tool

Advanced tool for extracting podcast episode transcripts from Spotify using GraphQL API reverse engineering and protobuf decoding.

## Features

- **GraphQL Pathfinder API**: Reverse-engineered Spotify podcast metadata endpoint
- **Protobuf Transcript Decoding**: Multi-fallback binary transcript parser
- **Canonical JSON Output**: Consistent format with chapters, segments, and paragraphs
- **Batch Processing**: Multiple episodes with rate limiting and retry logic
- **Authentication Support**: Bearer tokens or full header files
- **Chapter Detection**: Synthetic chapters for better navigation
- **Text Paragraphization**: Intelligent 2-4 sentence grouping

## Installation

```bash
npm install
npm run build
```

## Authentication

### Method 1: Bearer Token (Recommended)

1. Open [Spotify Web Player](https://open.spotify.com)
2. Open DevTools → Network tab
3. Play any podcast episode
4. Find a GraphQL request (pathfinder or similar)
5. Copy the `Authorization: Bearer ...` value

```bash
export SPOTIFY_BEARER_TOKEN="Bearer BQA6l4hQ..."
npm run ingest -- fetch --show "https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk"
```

### Method 2: Full Headers File

For more robustness, extract all headers:

```bash
# Save to headers.json:
{
  "authorization": "Bearer BQA6l4hQ...",
  "client-token": "AABrwNk...",
  "user-agent": "Mozilla/5.0..."
}

npm run ingest -- fetch --show "..." --headers ./headers.json
```

## Usage

### Basic Episode Extraction
```bash
npm run ingest -- fetch \
  --show "https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk" \
  --auth "Bearer BQA6l4hQ..." \
  --lang en \
  --out ./output
```

### Advanced Options
```bash
npm run ingest -- fetch \
  --show "https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk" \
  --headers ./headers.json \
  --market US \
  --lang en \
  --max-episodes 50 \
  --paragraph-min 2 \
  --paragraph-max 4 \
  --out ./output \
  --vtt --srt
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--show` | Spotify show URL or ID | Required |
| `--auth` | Bearer token | From env |
| `--headers` | Headers JSON file | Optional |
| `--market` | Market code (US, GB, etc) | US |
| `--lang` | Language code | en |
| `--max-episodes` | Max episodes to process | 10 |
| `--paragraph-min` | Min sentences per paragraph | 2 |
| `--paragraph-max` | Max sentences per paragraph | 4 |
| `--out` | Output directory | ./out |
| `--vtt` | Generate WebVTT files | false |
| `--srt` | Generate SubRip files | false |

## Output Format

### Canonical JSON Structure
```json
{
  "source": {
    "platform": "spotify",
    "show_id": "4rOoJ6Egrf8K2IrywzwOMk",
    "episode_id": "1fBkN07bR6PKNcaOHFyJ9n", 
    "title": "Episode Title",
    "channel": "Podcast Name",
    "duration_s": 3600,
    "rights": "spotify_ok",
    "language": "en",
    "captions_kind": "transcript"
  },
  "chapters": [
    {
      "idx": 1,
      "title": "Chapter 1 (0:00-20:00)",
      "start_s": 0,
      "end_s": 1200
    }
  ],
  "segments": [
    {
      "chapter_idx": 1,
      "start_s": 0.5,
      "end_s": 4.2,
      "text": "Welcome to the show...",
      "speaker": "Host",
      "confidence": 0.95
    }
  ],
  "paragraphs": [
    {
      "chapter_idx": 1,
      "start_s": 0.5,
      "end_s": 8.1, 
      "text": "Welcome to the show. Today we're discussing..."
    }
  ]
}
```

### File Structure
```
output/
├── 1fBkN07bR6PKNcaOHFyJ9n.json    # Canonical JSON
├── 1fBkN07bR6PKNcaOHFyJ9n.vtt     # WebVTT (if --vtt)
└── 1fBkN07bR6PKNcaOHFyJ9n.srt     # SubRip (if --srt)
```

## Technical Implementation

### Pathfinder GraphQL API

Spotify's internal GraphQL endpoint for podcast metadata:

```typescript
const query = {
  operationName: "queryShowEpisodes",
  variables: {
    uri: "spotify:show:4rOoJ6Egrf8K2IrywzwOMk",
    offset: 0,
    limit: 100
  },
  extensions: {
    persistedQuery: {
      version: 1,
      sha256Hash: "a0c8f5..."
    }
  }
};
```

### Protobuf Transcript Decoding

Multi-fallback strategy for binary transcript parsing:

```typescript
// Primary schema attempt
const transcriptType = root.lookupType('Transcript');
const decoded = transcriptType.decode(buffer);

// Fallback: Alternative field mapping
// Fallback: Raw binary parsing with known offsets
// Fallback: Pattern matching for text blocks
```

### Rate Limiting & Retry

```typescript
- Exponential backoff: 1s → 2s → 4s → 8s
- Max retries: 3 per request
- Respect 429 responses
- Randomized jitter to prevent thundering herd
```

## Troubleshooting

### Authentication Issues
```
Error: 401 Unauthorized
→ Token expired. Re-extract from Spotify Web Player
→ Check Bearer token format: "Bearer BQA..."
```

### Rate Limiting
```
Error: 429 Too Many Requests  
→ Tool automatically retries with backoff
→ Consider reducing --max-episodes
```

### Transcript Not Found
```
No transcript available for episode
→ Some episodes lack transcripts
→ Try different episodes from same show
```

### Protobuf Decode Errors
```
Could not decode protobuf transcript
→ Spotify changed binary format
→ Tool attempts multiple fallback strategies
→ May require format analysis update
```

## Development

### Adding New Protobuf Schemas

1. Capture new binary transcripts from network traffic
2. Analyze with protobuf tools:
```bash
protoc --decode_raw < transcript.bin
```
3. Add to `src/transcripts/proto/schemas/`
4. Update decode fallback chain

### GraphQL Query Updates

Monitor Spotify Web Player network requests:
- Look for `pathfinder` or `query` endpoints
- Extract `persistedQuery.sha256Hash` values
- Update `src/pathfinder/queries.ts`

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| AUTH_REQUIRED | Missing authentication | Add --auth or --headers |
| SHOW_NOT_FOUND | Invalid show ID/URL | Verify show exists and is public |
| EPISODE_UNAVAILABLE | Episode not accessible | Try different episodes |
| TRANSCRIPT_MISSING | No transcript data | Episode may lack transcripts |
| RATE_LIMITED | Too many requests | Automatic retry with backoff |
| DECODE_FAILED | Protobuf parse error | May need schema update |

## License

MIT License - Built for educational and research purposes.

**Important**: Respects Spotify's robots.txt and rate limits. Use responsibly.