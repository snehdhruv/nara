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

    // Get YouTube API key
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    
    if (!youtubeApiKey) {
      throw new Error('YouTube API key not configured. Please add YOUTUBE_API_KEY to environment variables.');
    }

    try {
      // Search for videos
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&type=video&videoDuration=medium&videoDuration=long&` +
        `q=${encodeURIComponent(query + ' audiobook')}&` +
        `maxResults=${maxResults}&key=${youtubeApiKey}`;

      const searchResponse = await fetch(searchUrl);
      
      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        throw new Error(`YouTube API error: ${searchResponse.status} - ${errorText}`);
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
      throw apiError;
    }

  } catch (error) {
    console.error('[YouTube Search API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
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
