import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;
    console.log('[API] Getting book from Convex:', bookId);
    
    // Get or create a demo user for testing
    let demoUserId;
    try {
      const users = await convex.query(api.seed.getFirstUser, {});
      if (users && users.length > 0) {
        demoUserId = users[0]._id;
      } else {
        demoUserId = await convex.mutation(api.seed.createSeedUser, {
          name: "Demo User",
          email: "demo@nara.com"
        });
      }
    } catch (error) {
      console.log('[API] Using fallback - skip progress tracking');
      demoUserId = null;
    }
    
    // Handle special slug case for "zero-to-one"
    let audiobook = null;
    if (bookId === "zero-to-one") {
      try {
        audiobook = await convex.query(api.audiobooks.getAudiobookByYouTubeId, {
          youtubeVideoId: "dz_4Mjyqbqk"
        });
      } catch (error) {
        console.log('[API] Zero to One book not found by YouTube ID');
      }
    } else {
      // Check if bookId looks like a Convex ID (starts with certain pattern) vs YouTube ID
      const isConvexId = bookId.match(/^[a-z0-9]{32}$/);
      
      if (isConvexId) {
        // Try to get audiobook by Convex ID first
        try {
          audiobook = await convex.query(api.audiobooks.getAudiobook, {
            audiobookId: bookId as any
          });
        } catch (error) {
          console.log('[API] Book not found by Convex ID, trying YouTube ID...');
        }
      }
      
      // If not found by ID, try by YouTube video ID
      if (!audiobook) {
        try {
          audiobook = await convex.query(api.audiobooks.getAudiobookByYouTubeId, {
            youtubeVideoId: bookId
          });
        } catch (error) {
          console.log('[API] Book not found by YouTube ID either');
        }
      }
    }
    
    if (!audiobook) {
      console.log('[API] Book not found:', bookId);
      return NextResponse.json(
        { success: false, error: 'Book not found' },
        { status: 404 }
      );
    }
    
    // Get user progress for this audiobook
    let progress = null;
    if (demoUserId) {
      try {
        progress = await convex.query(api.progress.getProgress, {
          userId: demoUserId,
          audiobookId: audiobook._id
        });
      } catch (error) {
        console.log('[API] No progress found for user, using defaults');
      }
    }
    
    const book = {
      id: audiobook._id,
      title: audiobook.title,
      author: audiobook.author,
      narrator: audiobook.narrator || audiobook.author,
      coverUrl: audiobook.coverUrl || "https://img.heroui.chat/image/book?w=400&h=600&u=default",
      duration: audiobook.duration,
      currentChapter: progress?.currentChapter || 1,
      chapterTitle: audiobook.chapters?.[0]?.title || "Chapter 1",
      progress: progress?.progress || 0,
      lastPosition: progress?.lastPosition || 0,
      youtubeVideoId: audiobook.youtubeVideoId,
      content: audiobook.content || [],
      chapters: audiobook.chapters || []
    };
    
    console.log('[API] Found audiobook:', book.title);
    
    return NextResponse.json({
      success: true,
      book
    });
    
  } catch (error) {
    console.error('[API] Book GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch book' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;
    const updates = await request.json();
    
    console.log(`[API] Updating book progress in Convex: ${bookId}`, updates);
    
    // Get or create a demo user for testing
    let demoUserId;
    try {
      const users = await convex.query(api.seed.getFirstUser, {});
      if (users && users.length > 0) {
        demoUserId = users[0]._id;
      } else {
        demoUserId = await convex.mutation(api.seed.createSeedUser, {
          name: "Demo User",
          email: "demo@nara.com"
        });
      }
    } catch (error) {
      console.log('[API] Using fallback - skip progress tracking');
      demoUserId = null;
    }
    
    // Handle special slug case for "zero-to-one" in PUT as well
    let audiobook = null;
    if (bookId === "zero-to-one") {
      try {
        audiobook = await convex.query(api.audiobooks.getAudiobookByYouTubeId, {
          youtubeVideoId: "dz_4Mjyqbqk"
        });
      } catch (error) {
        console.log('[API] Zero to One book not found by YouTube ID');
      }
    } else {
      // Check if bookId looks like a Convex ID vs YouTube ID
      const isConvexId = bookId.match(/^[a-z0-9]{32}$/);
      
      if (isConvexId) {
        try {
          audiobook = await convex.query(api.audiobooks.getAudiobook, {
            audiobookId: bookId as any
          });
        } catch (error) {
          console.log('[API] Book not found by Convex ID');
        }
      }
      
      // If not found by Convex ID or if it's not a Convex ID format, try by YouTube ID
      if (!audiobook) {
        try {
          audiobook = await convex.query(api.audiobooks.getAudiobookByYouTubeId, {
            youtubeVideoId: bookId
          });
        } catch (error) {
          console.log('[API] Book not found by YouTube ID either');
        }
      }
    }
    
    if (!audiobook) {
      return NextResponse.json(
        { success: false, error: 'Book not found' },
        { status: 404 }
      );
    }
    
    // Update progress in Convex
    if (demoUserId && ('progress' in updates || 'lastPosition' in updates || 'currentChapter' in updates)) {
      await convex.mutation(api.progress.updateProgress, {
        userId: demoUserId,
        audiobookId: audiobook._id,
        progress: updates.progress !== undefined ? Math.max(0, Math.min(1, updates.progress)) : undefined,
        lastPosition: updates.lastPosition !== undefined ? Math.max(0, updates.lastPosition) : 0,
        currentChapter: updates.currentChapter,
      });
    }
    
    console.log(`[API] Successfully updated book progress in Convex: ${bookId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Progress updated successfully'
    });
    
  } catch (error) {
    console.error('[API] Book PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update book' },
      { status: 500 }
    );
  }
}