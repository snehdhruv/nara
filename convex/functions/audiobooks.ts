import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("audiobooks").collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("audiobooks")
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .first();
  },
});

export const upsert = mutation({
  args: {
    slug: v.string(),
    title: v.string(),
    language: v.string(),
    spotifyAudiobookUri: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("audiobooks")
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, args);
    } else {
      return await ctx.db.insert("audiobooks", args);
    }
  },
});
