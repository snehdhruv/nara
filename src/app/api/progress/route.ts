import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { getUserId } from "../../../lib/auth-utils";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// GET /api/progress - Get user's reading progress
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'current'; // 'current' or 'completed'
    const bookId = searchParams.get('bookId'); // For individual book progress
    
    if (bookId) {
      // Get progress for specific book
      const progress = await convex.query(api.progress.getProgress, {
        userId,
        audiobookId: bookId
      });

      return NextResponse.json({
        success: true,
        progress: progress
      });
    } else if (type === 'current') {
      // Get currently reading books
      const currentlyReading = await convex.query(api.progress.getCurrentlyReading, {
        userId,
        limit: 5
      });

      return NextResponse.json({
        success: true,
        books: currentlyReading
      });
    } else if (type === 'completed') {
      // Get completed books
      const completedBooks = await convex.query(api.progress.getCompletedBooks, {
        userId,
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
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

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
      userId,
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

