# ASR YouTube Tool

YouTube ASR (OpenAI Whisper) → Chaptered Transcript JSON Tool

## Overview

This tool extracts YouTube videos, processes them through OpenAI Whisper for transcription, and outputs chaptered transcript JSON files. It serves as a fallback when closed captions are unavailable or rate-limited.

## Installation

```bash
cd tools/asr-youtube
npm install
```

## Environment Setup

```bash
cp .env.example .env
# Edit .env and set your OPENAI_API_KEY
```

## Usage

```bash
# Basic transcription
npm run transcribe -- --url https://www.youtube.com/watch?v=VIDEO_ID

# With options
npm run transcribe -- \
  --url https://www.youtube.com/watch?v=VIDEO_ID \
  --lang en \
  --paragraph-min 2 \
  --paragraph-max 4 \
  --out ./out \
  --title "Custom Title" \
  --rights owner_ok \
  --vtt \
  --srt
```

## Options

- `--url` (required): YouTube watch URL or video ID
- `--lang` (default: en): Language for transcription
- `--paragraph-min` (default: 2): Minimum sentences per paragraph
- `--paragraph-max` (default: 4): Maximum sentences per paragraph  
- `--out` (default: ./out): Output directory
- `--title`: Override video title
- `--rights` (default: owner_ok): Rights information
- `--vtt`: Generate WebVTT subtitle file
- `--srt`: Generate SubRip subtitle file

## Output

Creates `{videoId}.json` with canonical structure:

```json
{
  "source": {
    "platform": "youtube",
    "video_id": "VIDEO_ID",
    "title": "Video Title",
    "channel": "Channel Name", 
    "duration_s": 12345,
    "rights": "owner_ok",
    "language": "en",
    "captions_kind": "asr",
    "asr_provider": "openai",
    "asr_model": "whisper-1"
  },
  "chapters": [...],
  "segments": [...], 
  "paragraphs": [...]
}
```

## Integration

The JSON output plugs directly into ChapterLoader for LLM context.