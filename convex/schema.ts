import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    // User profile data
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    spotifyId: v.optional(v.string()),
    spotifyDisplayName: v.optional(v.string()),
    spotifyImageUrl: v.optional(v.string()),
  }),
  
  // Track Spotify playback state
  playbackState: defineTable({
    userId: v.id("users"),
    isPlaying: v.boolean(),
    track: v.optional(v.object({
      id: v.string(),
      name: v.string(),
      artist: v.string(),
      album: v.string(),
      imageUrl: v.optional(v.string()),
      durationMs: v.number(),
    })),
    progressMs: v.optional(v.number()),
    device: v.optional(v.object({
      id: v.string(),
      name: v.string(),
      type: v.string(),
      volumePercent: v.optional(v.number()),
    })),
    lastUpdated: v.number(),
  }).index("by_user", ["userId"]),
  
  // Store listening history 
  listeningHistory: defineTable({
    userId: v.id("users"),
    trackId: v.string(),
    trackName: v.string(),
    artist: v.string(),
    album: v.string(),
    playedAt: v.number(),
    durationPlayed: v.optional(v.number()), // How long they listened
  }).index("by_user", ["userId"])
    .index("by_user_played_at", ["userId", "playedAt"]),

  // Audiobooks table for storing audiobook metadata
  audiobooks: defineTable({
    title: v.string(),
    author: v.string(),
    narrator: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    duration: v.number(), // Total duration in seconds
    description: v.optional(v.string()),
    youtubeVideoId: v.optional(v.string()),
    totalChapters: v.optional(v.number()),
    isYouTube: v.boolean(), // Flag to identify YouTube vs static books
    // Store chapters data as JSON
    chapters: v.optional(v.array(v.object({
      idx: v.number(),
      title: v.string(),
      start_s: v.number(),
      end_s: v.number(),
    }))),
    // Store content data as JSON for text highlighting
    content: v.optional(v.array(v.object({
      text: v.string(),
      startTime: v.number(),
      endTime: v.number(),
    }))),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_youtube_id", ["youtubeVideoId"])
    .index("by_created", ["createdAt"])
    .index("by_is_youtube", ["isYouTube"]),

  // User progress for audiobooks
  audiobookProgress: defineTable({
    userId: v.id("users"),
    audiobookId: v.id("audiobooks"),
    progress: v.number(), // 0-1 completion percentage
    lastPosition: v.number(), // Current position in seconds
    currentChapter: v.optional(v.number()),
    lastPlayedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_audiobook", ["userId", "audiobookId"])
    .index("by_user_last_played", ["userId", "lastPlayedAt"]),

  // Notes taken during audiobook listening
  audiobookNotes: defineTable({
    userId: v.id("users"),
    audiobookId: v.id("audiobooks"),
    content: v.string(),
    timestamp: v.number(), // Position in audiobook when note was taken
    chapterIdx: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_audiobook", ["userId", "audiobookId"])
    .index("by_user_timestamp", ["userId", "audiobookId", "timestamp"]),
});