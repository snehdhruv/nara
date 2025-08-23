import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {
    userId: v.string(),
    audiobookId: v.id("audiobooks")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProgress")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("audiobookId"), args.audiobookId)
        )
      )
      .first();
  },
});

export const set = mutation({
  args: {
    userId: v.string(),
    audiobookId: v.id("audiobooks"),
    currentIdx: v.number(),
    completed: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userProgress")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("audiobookId"), args.audiobookId)
        )
      )
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        currentIdx: args.currentIdx,
        completed: args.completed,
      });
    } else {
      return await ctx.db.insert("userProgress", args);
    }
  },
});
