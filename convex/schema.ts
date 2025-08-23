import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  audiobooks: defineTable({
    slug: v.string(),
    title: v.string(),
    language: v.string(),
    spotifyAudiobookUri: v.optional(v.string()),
  }).index("slug", ["slug"]),

  chapters: defineTable({
    audiobookId: v.id("audiobooks"),
    idx: v.number(), // 1-based chapter index
    title: v.string(),
    spotifyChapterUri: v.optional(v.string()),
    startMs: v.optional(v.number()),
    endMs: v.optional(v.number()),
  }).index("audiobookId", ["audiobookId"])
   .index("audiobookId_idx", ["audiobookId", "idx"]),

  chapterTranscripts: defineTable({
    audiobookId: v.id("audiobooks"),
    idx: v.number(),
    text: v.optional(v.string()),
    segments: v.optional(v.array(v.object({
      startMs: v.number(),
      endMs: v.number(),
      text: v.string(),
    }))),
    rights: v.union(
      v.literal("public_domain"),
      v.literal("owner_ok"),
      v.literal("website_transcript"),
      v.literal("unknown")
    ),
  }).index("audiobookId_idx", ["audiobookId", "idx"]),

  userProgress: defineTable({
    userId: v.string(),
    audiobookId: v.id("audiobooks"),
    currentIdx: v.number(),
    completed: v.array(v.number()),
  }).index("userId", ["userId"])
   .index("userId_audiobookId", ["userId", "audiobookId"]),
});
