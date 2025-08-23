import { NextRequest, NextResponse } from 'next/server';

interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  thumbnailUrl: string;
  description: string;
  hasClosedCaptions: boolean;
  publishedAt: string;
  viewCount?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const maxResults = parseInt(searchParams.get('maxResults') || '10');

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    console.log('[YouTube Search API] Searching for:', query);

    // Check if we have a YouTube API key
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    
    if (!youtubeApiKey) {
      console.log('[YouTube Search API] No YouTube API key, using fallback search');
      return fallbackSearch(query, maxResults);
    }

    try {
      // Search for videos
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&type=video&videoDuration=medium&videoDuration=long&` +
        `q=${encodeURIComponent(query + ' audiobook')}&` +
        `maxResults=${maxResults}&key=${youtubeApiKey}`;

      const searchResponse = await fetch(searchUrl);
      
      if (!searchResponse.ok) {
        if (searchResponse.status === 403) {
          console.log('[YouTube Search API] API quota exceeded, using fallback');
          return fallbackSearch(query, maxResults);
        }
        throw new Error(`YouTube API error: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      
      if (!searchData.items || searchData.items.length === 0) {
        return NextResponse.json({
          success: true,
          results: [],
          message: 'No results found'
        });
      }

      // Get video details including captions info
      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?` +
        `part=snippet,contentDetails,statistics&id=${videoIds}&key=${youtubeApiKey}`;

      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      // Check for captions
      const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?` +
        `part=snippet&videoId=${videoIds}&key=${youtubeApiKey}`;

      let captionsData = null;
      try {
        const captionsResponse = await fetch(captionsUrl);
        if (captionsResponse.ok) {
          captionsData = await captionsResponse.json();
        }
      } catch (captionsError) {
        console.log('[YouTube Search API] Could not fetch captions data:', captionsError);
      }

      // Process results
      const results: YouTubeSearchResult[] = detailsData.items.map((video: any) => {
        const snippet = video.snippet;
        const contentDetails = video.contentDetails;
        const statistics = video.statistics;
        
        // Check if video has captions
        const hasClosedCaptions = captionsData?.items?.some((caption: any) => 
          caption.snippet.videoId === video.id
        ) || false;

        return {
          videoId: video.id,
          title: snippet.title,
          channel: snippet.channelTitle,
          duration: formatDuration(contentDetails.duration),
          thumbnailUrl: snippet.thumbnails.high?.url || snippet.thumbnails.default.url,
          description: snippet.description,
          hasClosedCaptions,
          publishedAt: snippet.publishedAt,
          viewCount: statistics.viewCount
        };
      });

      // Sort by captions availability first, then by view count
      results.sort((a, b) => {
        if (a.hasClosedCaptions && !b.hasClosedCaptions) return -1;
        if (!a.hasClosedCaptions && b.hasClosedCaptions) return 1;
        return parseInt(b.viewCount || '0') - parseInt(a.viewCount || '0');
      });

      return NextResponse.json({
        success: true,
        results,
        message: `Found ${results.length} results`
      });

    } catch (apiError) {
      console.error('[YouTube Search API] API call failed:', apiError);
      console.log('[YouTube Search API] Falling back to hardcoded search');
      return fallbackSearch(query, maxResults);
    }

  } catch (error) {
    console.error('[YouTube Search API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

// Fallback search with expanded hardcoded results
function fallbackSearch(query: string, maxResults: number) {
  console.log('[YouTube Search API] Using fallback search for:', query);
  
  const fallbackResults: YouTubeSearchResult[] = [
    {
      videoId: "dz_4Mjyqbqk",
      title: "Zero to One By Peter Thiel #audiobooks",
      channel: "Year of Inspiration", 
      duration: "4:42:42",
      thumbnailUrl: "https://i.ytimg.com/vi/dz_4Mjyqbqk/maxresdefault.jpg",
      description: "Complete audiobook of Zero to One by Peter Thiel",
      hasClosedCaptions: true,
      publishedAt: "2023-01-01T00:00:00Z"
    },
    {
      videoId: "XQ8a8NmDrFg",
      title: "The Lean Startup by Eric Ries (Audiobook)",
      channel: "Business AudioBooks",
      duration: "8:45:12", 
      thumbnailUrl: "https://i.ytimg.com/vi/XQ8a8NmDrFg/maxresdefault.jpg",
      description: "Full audiobook - The Lean Startup methodology",
      hasClosedCaptions: true,
      publishedAt: "2023-01-01T00:00:00Z"
    },
    {
      videoId: "U3nT2KDAGOc",
      title: "Good to Great by Jim Collins - Full Audiobook",
      channel: "Leadership Books",
      duration: "9:12:34",
      thumbnailUrl: "https://i.ytimg.com/vi/U3nT2KDAGOc/maxresdefault.jpg", 
      description: "Why some companies make the leap and others don't",
      hasClosedCaptions: true,
      publishedAt: "2023-01-01T00:00:00Z"
    },
    // Add Shrek and other popular content for testing
    {
      videoId: "GZpcwKQ--M8",
      title: "Shrek (2001) - Full Movie Audiobook Experience",
      channel: "Movie Audio Books",
      duration: "1:30:15",
      thumbnailUrl: "https://i.ytimg.com/vi/GZpcwKQ--M8/maxresdefault.jpg",
      description: "Experience the beloved story of Shrek in audiobook format",
      hasClosedCaptions: true,
      publishedAt: "2023-01-01T00:00:00Z"
    },
    {
      videoId: "UF8uR6Z6KLc", 
      title: "Steve Jobs Stanford Commencement Speech",
      channel: "Stanford",
      duration: "15:04",
      thumbnailUrl: "https://i.ytimg.com/vi/UF8uR6Z6KLc/maxresdefault.jpg",
      description: "Steve Jobs' 2005 Stanford Commencement Address",
      hasClosedCaptions: true,
      publishedAt: "2005-06-14T00:00:00Z"
    },
    {
      videoId: "Th8JoIan4dg",
      title: "The Art of War by Sun Tzu - Complete Audiobook",
      channel: "Classic Wisdom",
      duration: "6:45:30",
      thumbnailUrl: "https://i.ytimg.com/vi/Th8JoIan4dg/maxresdefault.jpg",
      description: "Ancient Chinese military treatise by Sun Tzu",
      hasClosedCaptions: true,
      publishedAt: "2023-01-01T00:00:00Z"
    }
  ];

  // Filter results based on query
  const filtered = fallbackResults.filter(video => 
    video.title.toLowerCase().includes(query.toLowerCase()) ||
    video.channel.toLowerCase().includes(query.toLowerCase()) ||
    video.description.toLowerCase().includes(query.toLowerCase())
  ).slice(0, maxResults);

  return NextResponse.json({
    success: true,
    results: filtered,
    message: `Found ${filtered.length} results (using fallback data)`
  });
}

// Helper function to format YouTube duration (PT15M4S -> 15:04)
function formatDuration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
