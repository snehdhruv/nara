import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get user's progress for a specific audiobook
export const getProgress = query({
  args: { 
    userId: v.id("users"),
    audiobookId: v.id("audiobooks") 
  },
  handler: async (ctx, { userId, audiobookId }) => {
    const progress = await ctx.db
      .query("audiobookProgress")
      .withIndex("by_user_audiobook", (q) => 
        q.eq("userId", userId).eq("audiobookId", audiobookId)
      )
      .first();
    
    return progress;
  },
});

// Get all audiobooks with progress for a user
export const getUserAudiobooksWithProgress = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Get all audiobooks
    const audiobooks = await ctx.db
      .query("audiobooks")
      .order("desc")
      .collect();
    
    // Get progress for each audiobook
    const audiobooksWithProgress = await Promise.all(
      audiobooks.map(async (audiobook) => {
        const progress = await ctx.db
          .query("audiobookProgress")
          .withIndex("by_user_audiobook", (q) => 
            q.eq("userId", userId).eq("audiobookId", audiobook._id)
          )
          .first();
        
        return {
          ...audiobook,
          progress: progress?.progress || 0,
          lastPosition: progress?.lastPosition || 0,
          currentChapter: progress?.currentChapter || 1,
          lastPlayedAt: progress?.lastPlayedAt,
        };
      })
    );
    
    return audiobooksWithProgress;
  },
});

// Get recently played audiobooks for a user
export const getRecentlyPlayed = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit = 10 }) => {
    const recentProgress = await ctx.db
      .query("audiobookProgress")
      .withIndex("by_user_last_played", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
    
    // Get audiobook details for each progress record
    const recentAudiobooks = await Promise.all(
      recentProgress.map(async (progress) => {
        const audiobook = await ctx.db.get(progress.audiobookId);
        if (!audiobook) return null;
        
        return {
          ...audiobook,
          progress: progress.progress,
          lastPosition: progress.lastPosition,
          currentChapter: progress.currentChapter,
          lastPlayedAt: progress.lastPlayedAt,
        };
      })
    );
    
    return recentAudiobooks.filter(Boolean);
  },
});

// Update user's progress for an audiobook
export const updateProgress = mutation({
  args: {
    userId: v.id("users"),
    audiobookId: v.id("audiobooks"),
    progress: v.number(),
    lastPosition: v.number(),
    currentChapter: v.optional(v.number()),
  },
  handler: async (ctx, { userId, audiobookId, progress, lastPosition, currentChapter }) => {
    const now = Date.now();
    
    // Check if progress record exists
    const existingProgress = await ctx.db
      .query("audiobookProgress")
      .withIndex("by_user_audiobook", (q) => 
        q.eq("userId", userId).eq("audiobookId", audiobookId)
      )
      .first();
    
    if (existingProgress) {
      // Update existing progress
      await ctx.db.patch(existingProgress._id, {
        progress: Math.max(0, Math.min(1, progress)), // Clamp between 0 and 1
        lastPosition: Math.max(0, lastPosition),
        currentChapter,
        lastPlayedAt: now,
        updatedAt: now,
      });
      
      return existingProgress._id;
    } else {
      // Create new progress record
      const progressId = await ctx.db.insert("audiobookProgress", {
        userId,
        audiobookId,
        progress: Math.max(0, Math.min(1, progress)),
        lastPosition: Math.max(0, lastPosition),
        currentChapter,
        lastPlayedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      
      return progressId;
    }
  },
});

// Reset progress for an audiobook
export const resetProgress = mutation({
  args: {
    userId: v.id("users"),
    audiobookId: v.id("audiobooks"),
  },
  handler: async (ctx, { userId, audiobookId }) => {
    const existingProgress = await ctx.db
      .query("audiobookProgress")
      .withIndex("by_user_audiobook", (q) => 
        q.eq("userId", userId).eq("audiobookId", audiobookId)
      )
      .first();
    
    if (existingProgress) {
      await ctx.db.patch(existingProgress._id, {
        progress: 0,
        lastPosition: 0,
        currentChapter: 1,
        lastPlayedAt: Date.now(),
        updatedAt: Date.now(),
      });
      
      return existingProgress._id;
    }
    
    return null;
  },
});

// Mark audiobook as completed
export const markCompleted = mutation({
  args: {
    userId: v.id("users"),
    audiobookId: v.id("audiobooks"),
  },
  handler: async (ctx, { userId, audiobookId }) => {
    const audiobook = await ctx.db.get(audiobookId);
    if (!audiobook) {
      throw new Error("Audiobook not found");
    }
    
    return await ctx.runMutation("progress:updateProgress", {
      userId,
      audiobookId,
      progress: 1.0,
      lastPosition: audiobook.duration,
      currentChapter: audiobook.totalChapters || undefined,
    });
  },
});