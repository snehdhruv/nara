import { request } from 'undici';
import { withBackoff, isRetryableError } from '../util/backoff.js';
import { log, progress, warn, error } from '../util/log.js';
import { buildEpisodesVariables, buildPathfinderQuery } from './variables.js';
import { discoverWorkingQuery } from './discovery.js';
import type { AuthConfig } from '../auth.js';

const PATHFINDER_URL = 'https://api-partner.spotify.com/pathfinder/v1/query';

// Cache discovered queries to avoid rediscovery
const discoveryCache = new Map<string, {
  endpoint: string;
  operationName: string;
  hash?: string;
}>();

export interface Episode {
  episode_id: string;
  title: string;
  duration_ms: number;
  publish_date?: string;
  transcript_url?: string;
  transcript_token?: string;
}

export interface EpisodesResponse {
  episodes: Episode[];
  hasMore: boolean;
  nextCursor?: string;
  nextOffset?: number;
  total?: number;
}

export interface FetchEpisodesOptions {
  showId: string;
  authConfig: AuthConfig;
  market?: string;
  lang?: string;
  maxEpisodes?: number;
  limit?: number;
}

export async function fetchAllEpisodes(options: FetchEpisodesOptions): Promise<Episode[]> {
  const { 
    showId, 
    authConfig, 
    market = 'US', 
    lang = 'en', 
    maxEpisodes = 100,
    limit = 50 
  } = options;

  log(`Fetching episodes for show: ${showId}`);
  log(`Max episodes: ${maxEpisodes}, Batch size: ${limit}`);

  // Try to get working query from cache or discovery
  let queryConfig = discoveryCache.get(showId);
  if (!queryConfig) {
    log('🔍 No cached query found, running discovery...');
    const discoveryResult = await discoverWorkingQuery(showId, authConfig);
    
    if (!discoveryResult.success) {
      throw new Error(`Could not discover working GraphQL query for show ${showId}: ${discoveryResult.error}`);
    }
    
    queryConfig = {
      endpoint: discoveryResult.endpoint!,
      operationName: discoveryResult.operationName!,
      hash: discoveryResult.hash
    };
    
    // Cache the successful query
    discoveryCache.set(showId, queryConfig);
  }

  const allEpisodes: Episode[] = [];
  let cursor: string | undefined;
  let offset = 0;
  let hasMore = true;

  while (hasMore && allEpisodes.length < maxEpisodes) {
    const remainingCount = maxEpisodes - allEpisodes.length;
    const batchLimit = Math.min(limit, remainingCount);

    progress(`Fetching batch: offset=${offset}, limit=${batchLimit}, total so far=${allEpisodes.length}`);

    try {
      const response = await withBackoff(
        () => fetchEpisodeBatch({
          showId,
          authConfig,
          market,
          lang,
          limit: batchLimit,
          cursor,
          offset: cursor ? undefined : offset
        }),
        isRetryableError
      );

      const episodes = response.episodes.slice(0, remainingCount);
      allEpisodes.push(...episodes);

      hasMore = response.hasMore && episodes.length === batchLimit;
      cursor = response.nextCursor;
      offset = response.nextOffset || (offset + episodes.length);

      log(`Batch complete: ${episodes.length} episodes, hasMore=${hasMore}`);

      // Rate limiting - be nice to Spotify's servers
      await sleep(100);

    } catch (err: any) {
      error(`Failed to fetch episode batch: ${err.message}`);
      break;
    }
  }

  log(`✅ Fetched ${allEpisodes.length} episodes total`);
  return allEpisodes;
}

async function fetchEpisodeBatch(params: {
  showId: string;
  authConfig: AuthConfig;
  market: string;
  lang: string;
  limit: number;
  cursor?: string;
  offset?: number;
}): Promise<EpisodesResponse> {
  const { showId, authConfig, market, lang, limit, cursor, offset } = params;

  const variables = buildEpisodesVariables(showId, {
    market,
    lang,
    limit,
    cursor,
    offset
  });

  const query = buildPathfinderQuery(variables);

  const response = await request(PATHFINDER_URL, {
    method: 'POST',
    headers: authConfig.headers,
    body: JSON.stringify(query)
  });

  if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
    const error = new Error(`Pathfinder request failed: ${response.statusCode}`);
    (error as any).status = response.statusCode;
    (error as any).headers = response.headers;
    throw error;
  }

  const data = await response.body.json() as any;

  if (data.errors) {
    throw new Error(`Pathfinder GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return parseEpisodesResponse(data);
}

function parseEpisodesResponse(data: any): EpisodesResponse {
  // This structure depends on the actual Pathfinder response format
  // You'll need to inspect the real response structure from browser devtools
  
  const showData = data.data?.podcastUnionV2 || data.data?.show || {};
  const episodesData = showData.episodes || showData.episodesV2 || {};
  
  const items = episodesData.items || episodesData.episodes || [];
  const pageInfo = episodesData.pageInfo || {};

  const episodes: Episode[] = items.map((item: any) => {
    // Parse episode data - structure may vary
    const episode = item.episode || item;
    
    return {
      episode_id: extractEpisodeId(episode.uri || episode.id),
      title: episode.name || episode.title || 'Unknown Title',
      duration_ms: episode.duration?.totalMilliseconds || episode.durationMs || 0,
      publish_date: episode.releaseDate?.isoString || episode.publishedAt,
      transcript_url: extractTranscriptUrl(episode),
      transcript_token: episode.transcriptToken
    };
  });

  return {
    episodes,
    hasMore: pageInfo.hasNextPage || false,
    nextCursor: pageInfo.endCursor,
    nextOffset: pageInfo.offset ? pageInfo.offset + items.length : undefined,
    total: episodesData.totalCount
  };
}

function extractEpisodeId(uri: string): string {
  if (uri.startsWith('spotify:episode:')) {
    return uri.replace('spotify:episode:', '');
  }
  return uri;
}

function extractTranscriptUrl(episode: any): string | undefined {
  // Common patterns seen in Spotify episode data
  if (episode.transcriptUrl) return episode.transcriptUrl;
  if (episode.transcript?.url) return episode.transcript.url;
  
  // Construct from episode ID if follows known pattern
  const episodeId = extractEpisodeId(episode.uri || episode.id);
  if (episodeId) {
    return `https://episode-transcripts.spotifycdn.com/${episodeId}`;
  }
  
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}