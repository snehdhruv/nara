# YouTube Audiobook → Chaptered Transcript JSON Ingest Tool

A Node.js/TypeScript tool that converts YouTube audiobook videos into chapter-scoped transcripts for LLM context. This tool fetches captions and metadata only - no media downloads.

## Features

- Fetches YouTube video metadata and captions (human or auto-generated)
- Extracts chapters from YouTube's chapter markers or video description timestamps
- Bins caption segments into chapter windows
- Creates paragraph blocks of 2-4 sentences for better readability
- Outputs canonical JSON format with time-stamped segments
- CLI and library API for flexible integration
- **Multi-tier fallback system:**
  1. **yt-dlp** (primary) - Reliable caption extraction
  2. **Cobalt API** (fallback) - When rate limited
  3. **OpenAI Whisper ASR** (final fallback) - Audio transcription when captions unavailable

## Installation

```bash
cd tools/ingest-youtube
npm install

# For ASR fallback, also set up the ASR tool
cd ../asr-youtube  
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY for ASR fallback
```

## Usage

### CLI

#### Single Video
```bash
pnpm ingest-youtube fetch --url https://www.youtube.com/watch?v=XXXX --lang en --fallback-auto
```

#### Multiple Videos
```bash
# Using multiple --url flags
pnpm ingest-youtube fetch --url URL1 --url URL2 --lang en

# Using a file
pnpm ingest-youtube fetch --file ./urls.txt --lang en
```

#### Options

- `--url` - YouTube URL(s) or video ID(s) (can be repeated)
- `--file` - File containing URLs (one per line)
- `--lang` - Language code for captions (default: "en")
- `--fallback-auto` - Use auto-generated captions if human captions unavailable
- `--min-paragraph-sentences` - Minimum sentences per paragraph (default: 2)
- `--max-paragraph-sentences` - Maximum sentences per paragraph (default: 4)
- `--out` - Output directory (default: ./tools/ingest-youtube/out)
- `--title` - Override detected video title
- `--license` - Rights status: owner_ok|licensed|public_domain (default: owner_ok)

### Library API

```typescript
import { ingestVideo, parseChaptersFromDescription, binSegmentsIntoChapters } from './src/index';

// Ingest a single video
const result = await ingestVideo({
  urlOrId: 'https://www.youtube.com/watch?v=XXXX',
  lang: 'en',
  fallbackAuto: true,
  outputDir: './data'
});

// Parse chapters from description text
const chapters = parseChaptersFromDescription(description, duration_s);

// Bin segments into chapters and create paragraphs
const { segments, paragraphs } = binSegmentsIntoChapters(
  captionSegments,
  chapters,
  { minParagraphSentences: 2, maxParagraphSentences: 4 }
);
```

## Output Format

The tool outputs JSON files named `<videoId>.json` with the following structure:

```json
{
  "source": {
    "platform": "youtube",
    "video_id": "VIDEO_ID",
    "title": "Video Title",
    "channel": "Channel Name",
    "duration_s": 3600,
    "rights": "owner_ok",
    "language": "en",
    "captions_kind": "human"
  },
  "chapters": [
    {
      "idx": 1,
      "title": "Introduction",
      "start_s": 0,
      "end_s": 300
    }
  ],
  "segments": [
    {
      "chapter_idx": 1,
      "start_s": 10.5,
      "end_s": 15.3,
      "text": "Caption text here"
    }
  ],
  "paragraphs": [
    {
      "chapter_idx": 1,
      "start_s": 10.5,
      "end_s": 45.2,
      "text": "Merged paragraph of 2-4 sentences..."
    }
  ]
}
```

## Example: URLs File

Create a `urls.txt` file:
```
https://www.youtube.com/watch?v=abc123
https://youtu.be/xyz789
def456
# Comments are ignored
```

Then run:
```bash
pnpm ingest-youtube fetch --file urls.txt --lang en --fallback-auto
```

## Integration

Copy the generated JSON files from `./tools/ingest-youtube/out/` to your application's data directory or directly load them in your ChapterLoader component.

## Notes

- The tool respects rate limits with a 1-second delay between batch requests
- No audio/video files are downloaded - only metadata and captions
- Chapters are detected in this order:
  1. YouTube's official chapter markers
  2. Timestamps parsed from video description
  3. Single "Full" chapter as fallback
- Captions preference:
  1. Human-generated captions in requested language
  2. Auto-generated captions (if --fallback-auto is set)
  3. Error if no captions available