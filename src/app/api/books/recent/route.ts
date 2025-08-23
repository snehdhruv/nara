import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    console.log('[API] Fetching recently played audiobooks...');
    
    // Get or create demo user for now (TODO: implement proper auth)
    let demoUserId;
    try {
      demoUserId = await convex.mutation(api.seed.createSeedUser, {
        name: "Demo User",
        email: "demo@nara.com"
      });
    } catch (error) {
      // User might already exist, get first user
      const users = await convex.query(api.seed.getFirstUser, {});
      if (users && users.length > 0) {
        demoUserId = users[0]._id;
      } else {
        return NextResponse.json({
          success: true,
          books: [],
          total: 0
        });
      }
    }
    
    // Get recently played audiobooks
    const recentlyPlayed = await convex.query(api.progress.getRecentlyPlayed, {
      userId: demoUserId,
      limit
    });
    
    console.log(`[API] Recent books raw from Convex:`, recentlyPlayed.length, recentlyPlayed.map(b => ({ title: b.title, progress: b.progress, lastPlayedAt: b.lastPlayedAt })));
    
    // Filter to only include books that have been started but not completed
    const currentlyReading = recentlyPlayed.filter(book => 
      book.progress > 0 && book.progress < 1
    );
    
    console.log(`[API] Filtered currently reading:`, currentlyReading.length, currentlyReading.map(b => ({ title: b.title, progress: b.progress })));
    
    const books = await Promise.all(currentlyReading.map(async book => {
      let coverUrl = book.coverUrl;
      if (!coverUrl || coverUrl.includes('img.heroui.chat/image/book?w=400&h=600&u=default')) {
        coverUrl = book.youtubeVideoId 
          ? `https://i.ytimg.com/vi/${book.youtubeVideoId}/maxresdefault.jpg`
          : `https://img.heroui.chat/image/book?w=400&h=600&title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author || '')}`;
      }
      
      return {
        id: book._id,
        title: book.title,
        author: book.author,
        narrator: book.narrator || book.author,
        coverUrl,
        progress: book.progress || 0,
        lastPosition: book.lastPosition || 0,
        duration: book.duration,
        description: book.description,
        youtubeVideoId: book.youtubeVideoId,
        totalChapters: book.totalChapters || 0
      };
    }));
    
    console.log(`[API] Returning ${books.length} currently reading audiobooks`);
    
    return NextResponse.json({
      success: true,
      books,
      total: books.length
    });
    
  } catch (error) {
    console.error('[API] Recent books GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent books' },
      { status: 500 }
    );
  }
}