import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    
    // Handle deletion requests
    if (requestData.action === 'delete') {
      console.log('[Save to Convex API] Deleting audiobook with video ID:', requestData.videoId);
      
      // Find the audiobook by YouTube video ID
      const existingBook = await convex.query(api.audiobooks.getAudiobookByYouTubeId, {
        youtubeVideoId: requestData.videoId
      });
      
      if (existingBook) {
        // Delete the audiobook
        await convex.mutation(api.audiobooks.deleteAudiobook, {
          audiobookId: existingBook._id
        });
        
        return NextResponse.json({
          success: true,
          deleted: true,
          audiobookId: existingBook._id
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Audiobook not found'
        });
      }
    }
    
    const audiobookData = requestData;
    console.log('[Save to Convex API] Processing:', audiobookData.title);
    
    // Check if audiobook already exists
    const existingBook = await convex.query(api.audiobooks.getAudiobookByYouTubeId, {
      youtubeVideoId: audiobookData.videoId
    });
    
    if (existingBook) {
      console.log('[Save to Convex API] Updating existing audiobook:', existingBook._id);
      
      // Update the existing audiobook with new content
      await convex.mutation(api.audiobooks.updateAudiobook, {
        audiobookId: existingBook._id,
        title: audiobookData.title,
        author: audiobookData.author,
        narrator: audiobookData.narrator,
        coverUrl: audiobookData.coverUrl,
        duration: audiobookData.duration,
        description: audiobookData.description,
        chapters: audiobookData.chapters,
        content: audiobookData.content
      });
      
      return NextResponse.json({
        success: true,
        audiobookId: existingBook._id,
        updated: true
      });
    } else {
      // Create new audiobook in Convex
      console.log('[Save to Convex API] Creating new audiobook:', audiobookData.title);
      
      const audiobookId = await convex.mutation(api.audiobooks.createAudiobook, {
        title: audiobookData.title,
        author: audiobookData.author,
        narrator: audiobookData.narrator,
        coverUrl: audiobookData.coverUrl,
        duration: audiobookData.duration,
        description: audiobookData.description,
        youtubeVideoId: audiobookData.videoId,
        totalChapters: audiobookData.chapters.length,
        isYouTube: true,
        chapters: audiobookData.chapters,
        content: audiobookData.content
      });
      
      console.log('[Save to Convex API] Created audiobook with ID:', audiobookId);
      
      return NextResponse.json({
        success: true,
        audiobookId: audiobookId,
        created: true
      });
    }
    
  } catch (error) {
    console.error('[Save to Convex API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save to Convex: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}