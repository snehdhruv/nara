import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByBook = query({
  args: { audiobookId: v.id("audiobooks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chapters")
      .filter((q) => q.eq(q.field("audiobookId"), args.audiobookId))
      .order("idx")
      .collect();
  },
});

export const get = query({
  args: {
    audiobookId: v.id("audiobooks"),
    idx: v.number()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chapters")
      .filter((q) =>
        q.and(
          q.eq(q.field("audiobookId"), args.audiobookId),
          q.eq(q.field("idx"), args.idx)
        )
      )
      .first();
  },
});

export const upsertMap = mutation({
  args: {
    audiobookId: v.id("audiobooks"),
    chapters: v.array(v.object({
      idx: v.number(),
      title: v.string(),
      spotifyChapterUri: v.optional(v.string()),
      startMs: v.optional(v.number()),
      endMs: v.optional(v.number()),
    }))
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const chapter of args.chapters) {
      const existing = await ctx.db
        .query("chapters")
        .filter((q) =>
          q.and(
            q.eq(q.field("audiobookId"), args.audiobookId),
            q.eq(q.field("idx"), chapter.idx)
          )
        )
        .first();

      if (existing) {
        results.push(await ctx.db.patch(existing._id, {
          title: chapter.title,
          spotifyChapterUri: chapter.spotifyChapterUri,
          startMs: chapter.startMs,
          endMs: chapter.endMs,
        }));
      } else {
        results.push(await ctx.db.insert("chapters", {
          audiobookId: args.audiobookId,
          ...chapter,
        }));
      }
    }

    return results;
  },
});
