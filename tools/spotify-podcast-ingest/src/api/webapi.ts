import { request } from 'undici';
import { log, progress, warn } from '../util/log.js';
import type { AuthConfig } from '../auth.js';

const WEB_API_BASE = 'https://api.spotify.com/v1';

export interface Episode {
  episode_id: string;
  title: string;
  duration_ms: number;
  publish_date?: string;
  description?: string;
  transcript_url?: string;
}

export interface Show {
  show_id: string;
  title: string;
  publisher: string;
  description?: string;
  total_episodes: number;
}

export async function getShow(showId: string, authConfig: AuthConfig): Promise<Show> {
  const url = `${WEB_API_BASE}/shows/${showId}`;
  
  const response = await request(url, {
    method: 'GET',
    headers: {
      ...authConfig.headers,
      'Content-Type': 'application/json'
    }
  });

  if (response.statusCode !== 200) {
    throw new Error(`Failed to fetch show: ${response.statusCode}`);
  }

  const data = await response.body.json() as any;
  
  return {
    show_id: data.id,
    title: data.name,
    publisher: data.publisher,
    description: data.description,
    total_episodes: data.total_episodes
  };
}

export async function getShowEpisodes(
  showId: string, 
  authConfig: AuthConfig,
  options: {
    limit?: number;
    offset?: number;
    market?: string;
  } = {}
): Promise<Episode[]> {
  const { limit = 50, offset = 0, market = 'US' } = options;
  
  const url = new URL(`${WEB_API_BASE}/shows/${showId}/episodes`);
  url.searchParams.set('limit', limit.toString());
  url.searchParams.set('offset', offset.toString());
  url.searchParams.set('market', market);

  log(`Fetching episodes: offset=${offset}, limit=${limit}`);
  
  const response = await request(url.toString(), {
    method: 'GET', 
    headers: {
      ...authConfig.headers,
      'Content-Type': 'application/json'
    }
  });

  if (response.statusCode !== 200) {
    const errorText = await response.body.text();
    throw new Error(`Failed to fetch episodes: ${response.statusCode} - ${errorText}`);
  }

  const data = await response.body.json() as any;
  
  const episodes: Episode[] = data.items.map((item: any) => ({
    episode_id: item.id,
    title: item.name,
    duration_ms: item.duration_ms,
    publish_date: item.release_date,
    description: item.description,
    // Try to find transcript URLs in episode data
    transcript_url: extractTranscriptUrl(item)
  }));

  log(`✅ Fetched ${episodes.length} episodes`);
  return episodes;
}

export async function getAllEpisodes(
  showId: string,
  authConfig: AuthConfig,
  maxEpisodes: number = 100
): Promise<Episode[]> {
  const allEpisodes: Episode[] = [];
  const limit = 50; // Max allowed by API
  let offset = 0;
  
  while (allEpisodes.length < maxEpisodes) {
    const remainingCount = maxEpisodes - allEpisodes.length;
    const batchLimit = Math.min(limit, remainingCount);
    
    try {
      const episodes = await getShowEpisodes(showId, authConfig, {
        limit: batchLimit,
        offset,
        market: 'US'
      });
      
      if (episodes.length === 0) {
        log('No more episodes to fetch');
        break;
      }
      
      allEpisodes.push(...episodes.slice(0, remainingCount));
      offset += episodes.length;
      
      progress(`Fetched ${allEpisodes.length}/${maxEpisodes} episodes`);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err: any) {
      warn(`Failed to fetch batch at offset ${offset}: ${err.message}`);
      break;
    }
  }
  
  log(`✅ Total episodes fetched: ${allEpisodes.length}`);
  return allEpisodes;
}

function extractTranscriptUrl(episode: any): string | undefined {
  // Check if episode has transcript data
  if (episode.audio_preview_url) {
    // Sometimes transcripts are available via similar URL patterns
    const episodeId = episode.id;
    return `https://episode-transcripts.spotifycdn.com/${episodeId}`;
  }
  
  return undefined;
}