import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for demo - would be replaced with Convex in production
let notesStorage: Array<{
  id: string;
  bookId: string;
  title: string;
  content: string;
  timestamp: number;
  audiobookPosition: number;
  topic?: string;
  userQuestion?: string;
  aiResponse?: string;
}> = [
  {
    id: "1",
    bookId: "zero-to-one",
    title: "Understanding Zero to One Concept",
    content: "We discussed Thiel's core concept that creating something entirely new (zero to one) is more valuable than copying existing ideas (one to n). This applies to both startups and innovation in general.",
    timestamp: Date.now() / 1000 - 3600, // 1 hour ago
    audiobookPosition: 420,
    topic: "Core Concepts",
    userQuestion: "What does Thiel mean by zero to one?",
    aiResponse: "Zero to One refers to creating something entirely new rather than copying what already exists. It's about going from nothing to something, which creates monopoly-like advantages."
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    
    let filteredNotes = notesStorage;
    
    // Filter by book if specified
    if (bookId) {
      filteredNotes = notesStorage.filter(note => note.bookId === bookId);
    }
    
    // Sort by timestamp (newest first for API, but components handle their own sorting)
    filteredNotes.sort((a, b) => b.timestamp - a.timestamp);
    
    return NextResponse.json({
      success: true,
      notes: filteredNotes,
      total: filteredNotes.length
    });
    
  } catch (error) {
    console.error('[API] Notes GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.content || !body.bookId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, content, bookId' },
        { status: 400 }
      );
    }
    
    // Create new note
    const newNote = {
      id: Date.now().toString(),
      bookId: body.bookId || 'zero-to-one',
      title: body.title,
      content: body.content,
      timestamp: body.timestamp || (Date.now() / 1000),
      audiobookPosition: body.audiobookPosition || 0,
      topic: body.topic,
      userQuestion: body.userQuestion,
      aiResponse: body.aiResponse
    };
    
    // Store the note (in production, this would save to Convex)
    notesStorage.push(newNote);
    
    console.log('[API] Created new note:', newNote.id, newNote.title);
    
    return NextResponse.json({
      success: true,
      note: newNote
    });
    
  } catch (error) {
    console.error('[API] Notes POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create note' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('id');
    
    if (!noteId) {
      return NextResponse.json(
        { success: false, error: 'Note ID is required' },
        { status: 400 }
      );
    }
    
    const initialLength = notesStorage.length;
    notesStorage = notesStorage.filter(note => note.id !== noteId);
    
    if (notesStorage.length === initialLength) {
      return NextResponse.json(
        { success: false, error: 'Note not found' },
        { status: 404 }
      );
    }
    
    console.log('[API] Deleted note:', noteId);
    
    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully'
    });
    
  } catch (error) {
    console.error('[API] Notes DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}