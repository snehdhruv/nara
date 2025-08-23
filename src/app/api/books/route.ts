import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { generateCoverUrl } from "../../../lib/utils/cover-generator";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('search');
    const category = searchParams.get('category');
    
    // For demo purposes, we'll get all audiobooks without user-specific data first
    // TODO: Implement proper auth integration
    
    console.log('[API] Seeding Zero to One audiobook if needed...');
    await convex.mutation(api.seed.seedZeroToOneAudiobook, {});
    
    console.log('[API] Creating demo user...');  
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
        // Create a fallback approach - just get audiobooks without user data
        console.log('[API] Falling back to audiobooks without user progress');
        const audiobooks = await convex.query(api.audiobooks.listAudiobooks, {});
        
        const books = await Promise.all(audiobooks.map(async book => {
          let coverUrl = book.coverUrl;
          if (!coverUrl || coverUrl.includes('img.heroui.chat/image/book?w=400&h=600&u=default')) {
            coverUrl = await generateCoverUrl({
              title: book.title,
              author: book.author,
              youtubeVideoId: book.youtubeVideoId
            });
            
            // Update the book in the database with the new cover
            if (coverUrl !== book.coverUrl) {
              try {
                await convex.mutation(api.audiobooks.updateCover, {
                  audiobookId: book._id,
                  coverUrl
                });
              } catch (error) {
                console.error(`Failed to update cover for ${book.title}:`, error);
              }
            }
          }
          
          return {
            id: book._id,
            title: book.title,
            author: book.author,
            narrator: book.narrator || book.author,
            coverUrl,
            progress: 0.23, // Default progress for demo
            lastPosition: 1420, // Default position for demo
            duration: book.duration,
            description: book.description,
            youtubeVideoId: book.youtubeVideoId,
            totalChapters: book.totalChapters || 0
          };
        }));
        
        return NextResponse.json({
          success: true,
          books,
          total: books.length
        });
      }
    }
    
    console.log('[API] Fetching audiobooks from Convex...');
    
    // Get all audiobooks with user progress
    const audiobooksWithProgress = await convex.query(api.progress.getUserAudiobooksWithProgress, {
      userId: demoUserId
    });
    
    let filteredBooks = await Promise.all(audiobooksWithProgress.map(async book => {
      let coverUrl = book.coverUrl;
      if (!coverUrl || coverUrl.includes('img.heroui.chat/image/book?w=400&h=600&u=default')) {
        coverUrl = await generateCoverUrl({
          title: book.title,
          author: book.author,
          youtubeVideoId: book.youtubeVideoId
        });
        
        // Update the book in the database with the new cover
        if (coverUrl !== book.coverUrl) {
          try {
            await convex.mutation(api.audiobooks.updateCover, {
              audiobookId: book._id,
              coverUrl
            });
          } catch (error) {
            console.error(`Failed to update cover for ${book.title}:`, error);
          }
        }
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
      // For now, all books are considered business/startup category
      if (category === 'business' || category === 'startup') {
        // Keep all books
      } else {
        filteredBooks = [];
      }
    }
    
    console.log(`[API] Returning ${filteredBooks.length} audiobooks`);
    
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
    const { audiobook } = await request.json();
    
    if (!audiobook) {
      return NextResponse.json(
        { success: false, error: 'Audiobook data is required' },
        { status: 400 }
      );
    }
    
    console.log('[API] Adding new audiobook to Convex:', audiobook.id);
    
    // Create audiobook in Convex
    const audiobookId = await convex.mutation(api.audiobooks.createAudiobook, {
      title: audiobook.title,
      author: audiobook.author,
      narrator: audiobook.narrator,
      coverUrl: audiobook.coverUrl,
      duration: audiobook.duration,
      description: `YouTube audiobook: ${audiobook.title}`,
      youtubeVideoId: audiobook.youtubeVideoId || audiobook.id,
      totalChapters: audiobook.chapters?.length || 0,
      isYouTube: true,
      chapters: audiobook.chapters,
      content: audiobook.content,
    });
    
    // Get the created audiobook
    const createdAudiobook = await convex.query(api.audiobooks.getAudiobook, {
      audiobookId
    });
    
    const responseBook = {
      id: createdAudiobook?._id,
      title: createdAudiobook?.title,
      author: createdAudiobook?.author,
      narrator: createdAudiobook?.narrator,
      coverUrl: createdAudiobook?.coverUrl,
      progress: 0,
      lastPosition: 0,
      duration: createdAudiobook?.duration,
      description: createdAudiobook?.description,
      youtubeVideoId: createdAudiobook?.youtubeVideoId,
      totalChapters: createdAudiobook?.totalChapters || 0
    };
    
    console.log('[API] Successfully added audiobook to Convex');
    
    return NextResponse.json({
      success: true,
      book: responseBook
    });
    
  } catch (error) {
    console.error('[API] Books POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create book' },
      { status: 500 }
    );
  }
}