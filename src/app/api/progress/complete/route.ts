import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const DEMO_USER_ID = 'k175aznf9t8wfzxpjx1h1s8f3c6zzxkh' as const;

// PUT /api/progress/complete - Mark book as completed
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId } = body;

    if (!bookId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: bookId'
      }, { status: 400 });
    }

    // Mark as completed in Convex
    await convex.mutation(api.progress.markCompleted, {
      userId: DEMO_USER_ID,
      audiobookId: bookId
    });

    return NextResponse.json({
      success: true,
      message: 'Book marked as completed'
    });
  } catch (error) {
    console.error('[API] Progress complete error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to mark book as completed'
    }, { status: 500 });
  }
}