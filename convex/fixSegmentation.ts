import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get audiobooks that need segmentation fixing
export const getAudiobooksNeedingSegmentation = query({
  args: {},
  handler: async (ctx) => {
    const audiobooks = await ctx.db
      .query("audiobooks")
      .withIndex("by_is_youtube", (q) => q.eq("isYouTube", true))
      .collect();
    
    // Find audiobooks with too few content segments (likely need re-segmentation)
    const needsFixing = audiobooks.filter(book => 
      book.youtubeVideoId && (
        !book.content || 
        book.content.length <= 5 || // Less than 5 segments is suspicious
        !book.chapters ||
        book.chapters.length <= 1 // Should have multiple chapters
      )
    );
    
    return needsFixing.map(book => ({
      _id: book._id,
      title: book.title,
      youtubeVideoId: book.youtubeVideoId,
      contentLength: book.content?.length || 0,
      chaptersLength: book.chapters?.length || 0
    }));
  },
});

// Fix segmentation for a specific audiobook by re-ingesting from YouTube
export const fixAudiobookSegmentation = mutation({
  args: { 
    audiobookId: v.id("audiobooks"),
  },
  handler: async (ctx, { audiobookId }) => {
    const audiobook = await ctx.db.get(audiobookId);
    if (!audiobook) {
      throw new Error("Audiobook not found");
    }
    
    if (!audiobook.youtubeVideoId) {
      throw new Error("Not a YouTube audiobook");
    }
    
    console.log(`Re-segmenting audiobook: ${audiobook.title}`);
    
    // Schedule an action to re-ingest this audiobook with proper segmentation using real YouTube data
    await ctx.scheduler.runAfter(0, "actions/reIngestAudiobook:reIngestAudiobook" as any, {
      audiobookId: audiobookId,
      youtubeVideoId: audiobook.youtubeVideoId
    });
    
    return { 
      success: true, 
      message: `Scheduled re-ingestion for: ${audiobook.title}` 
    };
  },
});

// Fix segmentation for all audiobooks that need it
export const fixAllAudiobookSegmentation = mutation({
  args: {},
  handler: async (ctx) => {
    const needsFixing = await ctx.db
      .query("audiobooks")
      .withIndex("by_is_youtube", (q) => q.eq("isYouTube", true))
      .collect();
    
    const toFix = needsFixing.filter(book => 
      book.youtubeVideoId && (
        !book.content || 
        book.content.length <= 5 ||
        !book.chapters ||
        book.chapters.length <= 1
      )
    );
    
    console.log(`Found ${toFix.length} audiobooks needing segmentation fixes`);
    
    let scheduledCount = 0;
    for (const audiobook of toFix) {
      try {
        await ctx.scheduler.runAfter(scheduledCount * 5000, "actions/reIngestAudiobook:reIngestAudiobook" as any, {
          audiobookId: audiobook._id,
          youtubeVideoId: audiobook.youtubeVideoId!
        });
        scheduledCount++;
        console.log(`Scheduled fix for: ${audiobook.title}`);
      } catch (error) {
        console.error(`Failed to schedule fix for ${audiobook.title}:`, error);
      }
    }
    
    return { 
      success: true, 
      totalFound: toFix.length,
      scheduledCount,
      message: `Scheduled ${scheduledCount} audiobooks for re-segmentation`
    };
  },
});