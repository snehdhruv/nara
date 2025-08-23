import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all available audiobooks
export const listAudiobooks = query({
  args: {},
  handler: async (ctx) => {
    const audiobooks = await ctx.db
      .query("audiobooks")
      .order("desc")
      .collect();
    
    return audiobooks;
  },
});

// Get a specific audiobook by ID
export const getAudiobook = query({
  args: { audiobookId: v.id("audiobooks") },
  handler: async (ctx, { audiobookId }) => {
    const audiobook = await ctx.db.get(audiobookId);
    return audiobook;
  },
});

// Get audiobook by YouTube video ID
export const getAudiobookByYouTubeId = query({
  args: { youtubeVideoId: v.string() },
  handler: async (ctx, { youtubeVideoId }) => {
    const audiobook = await ctx.db
      .query("audiobooks")
      .withIndex("by_youtube_id", (q) => q.eq("youtubeVideoId", youtubeVideoId))
      .first();
    
    return audiobook;
  },
});

// Add a new audiobook
export const createAudiobook = mutation({
  args: {
    title: v.string(),
    author: v.string(),
    narrator: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    duration: v.number(),
    description: v.optional(v.string()),
    youtubeVideoId: v.optional(v.string()),
    totalChapters: v.optional(v.number()),
    isYouTube: v.boolean(),
    chapters: v.optional(v.array(v.object({
      idx: v.number(),
      title: v.string(),
      start_s: v.number(),
      end_s: v.number(),
    }))),
    content: v.optional(v.array(v.object({
      text: v.string(),
      startTime: v.number(),
      endTime: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if audiobook with this YouTube ID already exists
    if (args.youtubeVideoId) {
      const existing = await ctx.db
        .query("audiobooks")
        .withIndex("by_youtube_id", (q) => q.eq("youtubeVideoId", args.youtubeVideoId))
        .first();
      
      if (existing) {
        // Update existing audiobook
        await ctx.db.patch(existing._id, {
          ...args,
          updatedAt: now,
        });
        return existing._id;
      }
    }
    
    // Create new audiobook
    const audiobookId = await ctx.db.insert("audiobooks", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    
    return audiobookId;
  },
});

// Update an existing audiobook
export const updateAudiobook = mutation({
  args: {
    audiobookId: v.id("audiobooks"),
    title: v.optional(v.string()),
    author: v.optional(v.string()),
    narrator: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    duration: v.optional(v.number()),
    description: v.optional(v.string()),
    totalChapters: v.optional(v.number()),
    chapters: v.optional(v.array(v.object({
      idx: v.number(),
      title: v.string(),
      start_s: v.number(),
      end_s: v.number(),
    }))),
    content: v.optional(v.array(v.object({
      text: v.string(),
      startTime: v.number(),
      endTime: v.number(),
    }))),
  },
  handler: async (ctx, { audiobookId, ...updates }) => {
    const audiobook = await ctx.db.get(audiobookId);
    if (!audiobook) {
      throw new Error("Audiobook not found");
    }
    
    await ctx.db.patch(audiobookId, {
      ...updates,
      updatedAt: Date.now(),
    });
    
    return audiobookId;
  },
});

// Update cover URL for an audiobook
export const updateCover = mutation({
  args: {
    audiobookId: v.id("audiobooks"),
    coverUrl: v.string(),
  },
  handler: async (ctx, { audiobookId, coverUrl }) => {
    const audiobook = await ctx.db.get(audiobookId);
    if (!audiobook) {
      throw new Error("Audiobook not found");
    }
    
    await ctx.db.patch(audiobookId, {
      coverUrl,
      updatedAt: Date.now(),
    });
    
    return { success: true, coverUrl };
  },
});

// Get audiobooks that need cover updates (no coverUrl or default covers)
export const getAudiobooksNeedingCovers = query({
  args: {},
  handler: async (ctx) => {
    const audiobooks = await ctx.db
      .query("audiobooks")
      .collect();
    
    return audiobooks.filter(book => 
      !book.coverUrl || 
      book.coverUrl.includes('img.heroui.chat/image/book?w=400&h=600&u=default')
    );
  },
});

// Delete an audiobook
export const deleteAudiobook = mutation({
  args: { audiobookId: v.id("audiobooks") },
  handler: async (ctx, { audiobookId }) => {
    const audiobook = await ctx.db.get(audiobookId);
    if (!audiobook) {
      throw new Error("Audiobook not found");
    }
    
    // Also delete associated progress and notes
    const progressRecords = await ctx.db
      .query("audiobookProgress")
      .withIndex("by_user_audiobook", (q) => q.eq("audiobookId", audiobookId))
      .collect();
    
    const noteRecords = await ctx.db
      .query("audiobookNotes")
      .withIndex("by_user_audiobook", (q) => q.eq("audiobookId", audiobookId))
      .collect();
    
    // Delete all related records
    for (const progress of progressRecords) {
      await ctx.db.delete(progress._id);
    }
    
    for (const note of noteRecords) {
      await ctx.db.delete(note._id);
    }
    
    // Delete the audiobook
    await ctx.db.delete(audiobookId);
    
    return { success: true };
  },
});