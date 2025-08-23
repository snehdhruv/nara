import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// The schema is normally optional, but Convex Auth
// requires indexes, so we need to define the schema.
export default defineSchema({
  // Auth tables for @convex-dev/auth
  // See https://labs.convex.dev/auth/setup
  ...authTables,

  // Legacy application tables (can be removed later)
  messages: defineTable({
    author: v.string(),
    body: v.string(),
    timestamp: v.number(),
  }),

  favorites: defineTable({
    userId: v.id("users"),
    trackId: v.string(),
    trackName: v.string(),
    artist: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // AI Audiobook Copilot - Core Tables

  // Audiobook metadata
  audiobooks: defineTable({
    title: v.string(),
    language: v.string(),
    author: v.optional(v.string()),
    narrator: v.optional(v.string()),
    totalChapters: v.optional(v.number()),
    coverImageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // Chapter information with Spotify/Audible integration
  chapters: defineTable({
    audiobookId: v.id("audiobooks"),
    idx: v.number(), // 0-based chapter index
    title: v.string(),
    spotifyChapterUri: v.optional(v.string()), // "spotify:track:xxx"
    audibleLocator: v.optional(v.string()), // Audible chapter locator
    startMs: v.optional(v.number()), // Chapter start time in audiobook
    endMs: v.optional(v.number()), // Chapter end time in audiobook
    durationMs: v.optional(v.number()), // Chapter duration
  }).index("by_audiobook_chapter_idx", ["audiobookId", "idx"]),

  // Chapter transcripts for AI processing
  chapterTranscripts: defineTable({
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
    createdAt: v.number(),
  }).index("by_audiobook_chapter_idx", ["audiobookId", "chapterIdx"]),

  // User reading progress for spoiler gating
  userProgress: defineTable({
    userId: v.string(), // From authentication
    audiobookId: v.id("audiobooks"),
    currentIdx: v.number(), // Current chapter index
    completed: v.array(v.number()), // Array of completed chapter indices
    lastPositionMs: v.optional(v.number()), // Last playback position
    lastUpdatedAt: v.number(),
  }).index("by_user_audiobook", ["userId", "audiobookId"]),

  // Voice and audio preferences
  voiceState: defineTable({
    userId: v.string(),
    muted: v.boolean(),
    micEnabled: v.boolean(),
    voiceSpeed: v.optional(v.number()), // TTS speed multiplier
    voiceId: v.optional(v.string()), // ElevenLabs voice ID
    lastUpdatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Optional: User memory for personalized responses
  userMemory: defineTable({
    userId: v.string(),
    audiobookId: v.id("audiobooks"),
    blobRef: v.optional(v.string()), // Reference to stored memory blob
    summary: v.optional(v.string()), // Human-readable summary
    createdAt: v.number(),
  }).index("by_user_audiobook", ["userId", "audiobookId"]),
});
