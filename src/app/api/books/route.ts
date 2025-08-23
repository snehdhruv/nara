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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('search');
    const category = searchParams.get('category');
    
    // Load the actual audiobook data
    const zeroToOneData = loadZeroToOneData();
    if (!zeroToOneData) {
      return NextResponse.json(
        { success: false, error: 'Failed to load audiobook data' },
        { status: 500 }
      );
    }
    
    // Convert the zero-to-one data into the expected book format
    const books = [{
      id: "zero-to-one",
      title: zeroToOneData.source.title,
      author: "Peter Thiel",
      narrator: "Blake Masters", 
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=zero-to-one",
      progress: 0.23, // Will be retrieved from user progress later
      lastPosition: 1420, // Will be retrieved from user progress later
      duration: zeroToOneData.source.duration_s,
      description: "Notes on Startups, or How to Build the Future",
      youtubeVideoId: zeroToOneData.source.video_id,
      totalChapters: zeroToOneData.chapters.length
    }];
    
    let filteredBooks = books;
    
    // Apply search filter
    if (query) {
      const searchTerm = query.toLowerCase();
      filteredBooks = filteredBooks.filter(book => 
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm) ||
        book.description?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply category filter
    if (category && category !== 'all') {
      if (category === 'business' || category === 'startup') {
        // Zero to One fits in business/startup category
        filteredBooks = books;
      } else {
        filteredBooks = [];
      }
    }
    
    return NextResponse.json({
      success: true,
      books: filteredBooks,
      total: filteredBooks.length
    });
    
  } catch (error) {
    console.error('[API] Books GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch books' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // For now, we only support Zero to One. Additional books would be added here.
    return NextResponse.json(
      { success: false, error: 'Adding new books not yet implemented' },
      { status: 501 }
    );
    
  } catch (error) {
    console.error('[API] Books POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create book' },
      { status: 500 }
    );
  }
}