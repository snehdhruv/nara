import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get user's bookmarked audiobooks
export const getUserBookmarks = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const bookmarks = await ctx.db
      .query("audiobookBookmarks")
      .withIndex("by_user", q => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Get audiobook details for each bookmark
    const bookmarkedAudiobooks = await Promise.all(
      bookmarks.map(async (bookmark) => {
        const audiobook = await ctx.db.get(bookmark.audiobookId);
        if (!audiobook) return null;

        // Get user's progress for this audiobook
        const progress = await ctx.db
          .query("audiobookProgress")
          .withIndex("by_user_audiobook", q => 
            q.eq("userId", userId).eq("audiobookId", bookmark.audiobookId)
          )
          .first();

        return {
          ...audiobook,
          bookmarkedAt: bookmark.createdAt,
          progress: progress?.progress || 0,
          lastPosition: progress?.lastPosition || 0,
          lastPlayedAt: progress?.lastPlayedAt
        };
      })
    );

    return bookmarkedAudiobooks.filter(book => book !== null);
  },
});

// Check if audiobook is bookmarked by user
export const isBookmarked = query({
  args: { 
    userId: v.id("users"),
    audiobookId: v.id("audiobooks")
  },
  handler: async (ctx, { userId, audiobookId }) => {
    const bookmark = await ctx.db
      .query("audiobookBookmarks")
      .withIndex("by_user_audiobook", q => 
        q.eq("userId", userId).eq("audiobookId", audiobookId)
      )
      .first();

    return bookmark !== null;
  },
});

// Add bookmark
export const addBookmark = mutation({
  args: {
    userId: v.id("users"),
    audiobookId: v.id("audiobooks")
  },
  handler: async (ctx, { userId, audiobookId }) => {
    // Check if already bookmarked
    const existing = await ctx.db
      .query("audiobookBookmarks")
      .withIndex("by_user_audiobook", q => 
        q.eq("userId", userId).eq("audiobookId", audiobookId)
      )
      .first();

    if (existing) {
      throw new Error("Audiobook already bookmarked");
    }

    const bookmarkId = await ctx.db.insert("audiobookBookmarks", {
      userId,
      audiobookId,
      createdAt: Date.now(),
    });

    return bookmarkId;
  },
});

// Remove bookmark
export const removeBookmark = mutation({
  args: {
    userId: v.id("users"),
    audiobookId: v.id("audiobooks")
  },
  handler: async (ctx, { userId, audiobookId }) => {
    const bookmark = await ctx.db
      .query("audiobookBookmarks")
      .withIndex("by_user_audiobook", q => 
        q.eq("userId", userId).eq("audiobookId", audiobookId)
      )
      .first();

    if (!bookmark) {
      throw new Error("Bookmark not found");
    }

    await ctx.db.delete(bookmark._id);
    return { success: true };
  },
});