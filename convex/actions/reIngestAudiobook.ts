"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

export const reIngestAudiobook = action({
  args: {
    audiobookId: v.id("audiobooks"),
    youtubeVideoId: v.string(),
  },
  handler: async (ctx, { audiobookId, youtubeVideoId }) => {
    console.log(`Re-ingesting audiobook with YouTube ID: ${youtubeVideoId}`);
    
    try {
      // Import the YouTube ingestion tool
      const { ingestVideo } = await import("../../tools/ingest-youtube/src/index");
      
      // Re-ingest the video with proper segmentation using real YouTube data
      console.log(`Starting real ingestion for ${youtubeVideoId}`);
      const canonicalJson = await ingestVideo({
        urlOrId: youtubeVideoId,
        lang: 'en',
        fallbackAuto: true,
        minParagraphSentences: 2,
        maxParagraphSentences: 4,
        rights: 'owner_ok'
      });
      
      console.log(`Ingested data: ${canonicalJson.chapters.length} chapters, ${canonicalJson.segments.length} segments, ${canonicalJson.paragraphs.length} paragraphs`);
      
      // Convert the canonical format to our database format
      const chapters = canonicalJson.chapters.map(ch => ({
        idx: ch.idx,
        title: ch.title,
        start_s: ch.start_s,
        end_s: ch.end_s
      }));
      
      // Use paragraphs for content (better for reading than individual segments)  
      const content = canonicalJson.paragraphs.map(p => ({
        text: p.text,
        startTime: p.start_s,
        endTime: p.end_s
      }));
      
      console.log(`Converted to DB format: ${chapters.length} chapters, ${content.length} content blocks`);
      
      // Update the audiobook with proper segmentation
      await ctx.runMutation(api.audiobooks.updateAudiobook, {
        audiobookId: audiobookId,
        chapters: chapters,
        content: content,
        totalChapters: chapters.length
      });
      
      return { 
        success: true, 
        youtubeVideoId,
        chaptersCount: chapters.length,
        contentCount: content.length
      };
      
    } catch (error: any) {
      console.error(`Failed to re-ingest ${youtubeVideoId}:`, error.message);
      throw new Error(`Re-ingestion failed: ${error.message}`);
    }
  },
});