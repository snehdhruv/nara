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
});