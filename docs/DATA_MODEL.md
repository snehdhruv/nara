# AI Audiobook Copilot - Data Model

## Convex Schema Definition

### Core Tables

#### audiobooks
```typescript
{
  _id: v.id("audiobooks"),
  title: v.string(),
  language: v.string(),
  author: v.optional(v.string()),
  narrator: v.optional(v.string()),
  totalChapters: v.optional(v.number()),
  coverImageUrl: v.optional(v.string()),
  createdAt: v.number(), // timestamp
  updatedAt: v.number(), // timestamp
}
```

#### chapters
```typescript
{
  _id: v.id("chapters"),
  audiobookId: v.id("audiobooks"),
  idx: v.number(), // 0-based chapter index
  title: v.string(),
  spotifyChapterUri: v.optional(v.string()), // "spotify:track:xxx"
  audibleLocator: v.optional(v.string()), // Audible chapter locator
  startMs: v.optional(v.number()), // Chapter start time in audiobook
  endMs: v.optional(v.number()), // Chapter end time in audiobook
  durationMs: v.optional(v.number()), // Chapter duration
}
```

#### chapterTranscripts
```typescript
{
  _id: v.id("chapterTranscripts"),
  audiobookId: v.id("audiobooks"),
  chapterIdx: v.number(),
  content: v.union(
    v.string(), // Full text transcript
    v.array(v.object({ // Segmented transcript
      startMs: v.number(),
      endMs: v.number(),
      text: v.string(),
    }))
  ),
  format: v.string(), // "text" | "segments"
  createdAt: v.number(), // timestamp
}
```

#### userProgress
```typescript
{
  _id: v.id("userProgress"),
  userId: v.string(), // From authentication
  audiobookId: v.id("audiobooks"),
  currentIdx: v.number(), // Current chapter index
  completed: v.array(v.number()), // Array of completed chapter indices
  lastPositionMs: v.optional(v.number()), // Last playback position
  lastUpdatedAt: v.number(), // timestamp
}
```

#### voiceState
```typescript
{
  _id: v.id("voiceState"),
  userId: v.string(),
  muted: v.boolean(),
  micEnabled: v.boolean(),
  voiceSpeed: v.optional(v.number()), // TTS speed multiplier
  voiceId: v.optional(v.string()), // ElevenLabs voice ID
  lastUpdatedAt: v.number(), // timestamp
}
```

#### userMemory (Optional)
```typescript
{
  _id: v.id("userMemory"),
  userId: v.string(),
  audiobookId: v.id("audiobooks"),
  blobRef: v.optional(v.string()), // Reference to stored memory blob
  summary: v.optional(v.string()), // Human-readable summary
  createdAt: v.number(), // timestamp
}
```

## Access Patterns

### Primary Queries
- `getUserProgress(userId, audiobookId)` - Current chapter for spoiler gating
- `getChapterTranscript(audiobookId, chapterIdx)` - Content for AI processing
- `getAudiobookChapters(audiobookId)` - Chapter list for picker UI
- `getUserVoiceState(userId)` - Voice settings for TTS

### Mutations
- `updateProgress(userId, audiobookId, chapterIdx)` - Save reading progress
- `completeChapter(userId, audiobookId, chapterIdx)` - Mark chapter complete
- `updateVoiceState(userId, settings)` - Save voice preferences

## Indexes & Performance

### Required Indexes
- `by_audiobook_chapter_idx` on chapters(audiobookId, idx)
- `by_audiobook_chapter_idx` on chapterTranscripts(audiobookId, chapterIdx)
- `by_user_audiobook` on userProgress(userId, audiobookId)
- `by_user` on voiceState(userId)

### Caching Strategy
- Chapter transcripts: Cache frequently accessed chapters
- User progress: Real-time updates across devices
- Voice state: Sync across browser sessions

## Data Migration & Seeding

### Initial Data Population
- Batch import audiobook metadata
- Progressive transcript loading
- Chapter mapping from Spotify/Audible APIs

### Versioning
- Schema versioning for future updates
- Backward compatibility for existing data
- Migration scripts for breaking changes
