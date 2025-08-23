import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { generateCoverUrl } from '../../../../lib/utils/cover-generator';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log('[Cover Refresh API] Starting cover refresh process...');
    
    // Get audiobooks that need cover updates
    const audiobooksNeedingCovers = await convex.query(api.audiobooks.getAudiobooksNeedingCovers, {});
    
    console.log(`[Cover Refresh API] Found ${audiobooksNeedingCovers.length} audiobooks needing cover updates`);
    
    let updatedCount = 0;
    const errors: Array<{ id: string; title: string; error: string }> = [];
    
    for (const audiobook of audiobooksNeedingCovers) {
      try {
        console.log(`[Cover Refresh API] Generating cover for: ${audiobook.title}`);
        
        // Generate a new cover URL
        const newCoverUrl = await generateCoverUrl({
          title: audiobook.title,
          author: audiobook.author,
          youtubeVideoId: audiobook.youtubeVideoId
        });
        
        // Update the audiobook with the new cover
        await convex.mutation(api.audiobooks.updateCover, {
          audiobookId: audiobook._id,
          coverUrl: newCoverUrl
        });
        
        console.log(`[Cover Refresh API] Updated cover for: ${audiobook.title} -> ${newCoverUrl}`);
        updatedCount++;
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Cover Refresh API] Failed to update cover for ${audiobook.title}:`, errorMsg);
        errors.push({
          id: audiobook._id,
          title: audiobook.title,
          error: errorMsg
        });
      }
    }
    
    console.log(`[Cover Refresh API] Cover refresh completed. Updated: ${updatedCount}, Errors: ${errors.length}`);
    
    return NextResponse.json({
      success: true,
      message: `Cover refresh completed`,
      stats: {
        total: audiobooksNeedingCovers.length,
        updated: updatedCount,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('[Cover Refresh API] Cover refresh failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to refresh covers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get status of audiobooks needing covers
    const audiobooksNeedingCovers = await convex.query(api.audiobooks.getAudiobooksNeedingCovers, {});
    
    return NextResponse.json({
      success: true,
      audiobooksNeedingCovers: audiobooksNeedingCovers.length,
      books: audiobooksNeedingCovers.map(book => ({
        id: book._id,
        title: book.title,
        author: book.author,
        currentCover: book.coverUrl || 'none',
        youtubeVideoId: book.youtubeVideoId
      }))
    });
    
  } catch (error) {
    console.error('[Cover Refresh API] Failed to get cover status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get cover status' },
      { status: 500 }
    );
  }
}