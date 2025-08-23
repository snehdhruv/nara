import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the actual Zero to One audiobook data
function loadZeroToOneData() {
  try {
    const filePath = join(process.cwd(), 'data', 'zero-to-one.json');
    const fileContent = readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('[API] Failed to load Zero to One data:', error);
    return null;
  }
}

// Generate sample timed content for chapters (since we don't have actual transcript data)
function generateTimedContent(chapterData: any) {
  const content = [];
  
  // Generate sample content based on chapter title and duration
  const sampleTexts = [
    `This is Chapter ${chapterData.idx}: ${chapterData.title}. In this chapter, we'll explore key concepts that build upon Peter Thiel's framework for innovation and monopoly thinking.`,
    "The ideas presented here challenge conventional wisdom about competition and market dynamics, offering a fresh perspective on how successful businesses are built.",
    "As Thiel explains, the goal isn't to compete in existing markets, but to create new markets where you can establish lasting competitive advantages.",
    "This chapter delves into the practical applications of zero-to-one thinking in real-world business scenarios."
  ];
  
  const chapterDuration = chapterData.end_s - chapterData.start_s;
  const segmentDuration = chapterDuration / sampleTexts.length;
  
  sampleTexts.forEach((text: string, index: number) => {
    const startTime = chapterData.start_s + (index * segmentDuration);
    const endTime = startTime + segmentDuration;
    
    content.push({
      text: text,
      startTime: Math.floor(startTime),
      endTime: Math.floor(endTime)
    });
  });
  
  return content;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (id !== 'zero-to-one') {
      return NextResponse.json(
        { success: false, error: 'Book not found' },
        { status: 404 }
      );
    }
    
    // Load the actual audiobook data
    const zeroToOneData = loadZeroToOneData();
    if (!zeroToOneData) {
      return NextResponse.json(
        { success: false, error: 'Failed to load audiobook data' },
        { status: 500 }
      );
    }
    
    // Get current chapter (default to first chapter)
    const currentChapterIdx = 1;
    const currentChapter = zeroToOneData.chapters.find((ch: any) => ch.idx === currentChapterIdx);
    
    if (!currentChapter) {
      return NextResponse.json(
        { success: false, error: 'Chapter not found' },
        { status: 404 }
      );
    }
    
    // Generate timed content for the current chapter
    const timedContent = generateTimedContent(currentChapter);
    
    const book = {
      id: "zero-to-one",
      title: zeroToOneData.source.title,
      author: "Peter Thiel",
      narrator: "Blake Masters",
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=zero-to-one",
      duration: zeroToOneData.source.duration_s,
      currentChapter: currentChapterIdx,
      chapterTitle: currentChapter.title,
      progress: 0.23, // Will be retrieved from user progress later
      lastPosition: 1420, // Will be retrieved from user progress later
      youtubeVideoId: zeroToOneData.source.video_id,
      content: timedContent,
      chapters: zeroToOneData.chapters.map((ch: any) => ({
        idx: ch.idx,
        title: ch.title,
        start_s: ch.start_s,
        end_s: ch.end_s
      }))
    };
    
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
    const { id } = await params;
    const body = await request.json();
    
    if (id !== 'zero-to-one') {
      return NextResponse.json(
        { success: false, error: 'Book not found' },
        { status: 404 }
      );
    }
    
    // In a real implementation, this would update the user's progress in Convex
    // For now, we'll just validate the data and return success
    
    const updates: any = {};
    
    if ('progress' in body) {
      updates.progress = Math.max(0, Math.min(1, body.progress));
    }
    
    if ('lastPosition' in body) {
      updates.lastPosition = Math.max(0, body.lastPosition);
    }
    
    if ('currentChapter' in body) {
      updates.currentChapter = body.currentChapter;
    }
    
    console.log(`[API] Updated book ${id}:`, updates);
    
    // Load updated book data
    const zeroToOneData = loadZeroToOneData();
    if (!zeroToOneData) {
      return NextResponse.json(
        { success: false, error: 'Failed to load audiobook data' },
        { status: 500 }
      );
    }
    
    const book = {
      id: "zero-to-one",
      title: zeroToOneData.source.title,
      author: "Peter Thiel",
      narrator: "Blake Masters",
      duration: zeroToOneData.source.duration_s,
      youtubeVideoId: zeroToOneData.source.video_id,
      ...updates
    };
    
    return NextResponse.json({
      success: true,
      book
    });
    
  } catch (error) {
    console.error('[API] Book PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update book' },
      { status: 500 }
    );
  }
}