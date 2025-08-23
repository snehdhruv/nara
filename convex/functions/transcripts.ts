import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByChapter = query({
  args: {
    audiobookId: v.id("audiobooks"),
    idx: v.number()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chapterTranscripts")
      .filter((q) =>
        q.and(
          q.eq(q.field("audiobookId"), args.audiobookId),
          q.eq(q.field("idx"), args.idx)
        )
      )
      .first();
  },
});

export const upsert = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chapterTranscripts")
      .filter((q) =>
        q.and(
          q.eq(q.field("audiobookId"), args.audiobookId),
          q.eq(q.field("idx"), args.idx)
        )
      )
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, args);
    } else {
      return await ctx.db.insert("chapterTranscripts", args);
    }
  },
});
