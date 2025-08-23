import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const DEMO_USER_ID = 'k175aznf9t8wfzxpjx1h1s8f3c6zzxkh' as const;

// GET /api/progress - Get user's reading progress
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'current'; // 'current' or 'completed'
    const bookId = searchParams.get('bookId'); // For individual book progress
    
    if (bookId) {
      // Get progress for specific book
      const progress = await convex.query(api.progress.getProgress, {
        userId: DEMO_USER_ID,
        audiobookId: bookId
      });

      return NextResponse.json({
        success: true,
        progress: progress
      });
    } else if (type === 'current') {
      // Get currently reading books
      const currentlyReading = await convex.query(api.progress.getCurrentlyReading, {
        userId: DEMO_USER_ID,
        limit: 5
      });

      return NextResponse.json({
        success: true,
        books: currentlyReading
      });
    } else if (type === 'completed') {
      // Get completed books
      const completedBooks = await convex.query(api.progress.getCompletedBooks, {
        userId: DEMO_USER_ID,
        limit: 10
      });

      return NextResponse.json({
        success: true,
        books: completedBooks
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid type parameter. Use "current" or "completed"'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('[API] Progress GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch progress'
    }, { status: 500 });
  }
}

// POST /api/progress - Update reading progress
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, progress, position, chapter } = body;

    if (!bookId || typeof progress !== 'number' || typeof position !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: bookId, progress, position'
      }, { status: 400 });
    }

    // Update progress in Convex
    await convex.mutation(api.progress.updateProgress, {
      userId: DEMO_USER_ID,
      audiobookId: bookId,
      progress,
      lastPosition: position,
      currentChapter: chapter
    });

    return NextResponse.json({
      success: true,
      message: 'Progress updated successfully'
    });
  } catch (error) {
    console.error('[API] Progress POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update progress'
    }, { status: 500 });
  }
}

