import { getAllEpisodes, getShow, type Episode } from './api/webapi.js';
import { fetchEpisodeTranscript } from './transcripts/fetch.js';
import { paragraphizeSegments } from './text/paragraphize.js';
import { writeCanonicalJSON, createDefaultChapter } from './output/canonical.js';
import { writeVTT } from './output/vtt.js';
import { writeSRT } from './output/srt.js';
import { loadAuthConfig } from './auth.js';
import { log, progress, success, error, warn } from './util/log.js';

export interface IngestOptions {
  showId: string;
  bearerToken?: string;
  headersFile?: string;
  market?: string;
  lang?: string;
  maxEpisodes?: number;
  paragraphMin?: number;
  paragraphMax?: number;
  out?: string;
  vtt?: boolean;
  srt?: boolean;
}

export async function ingestSpotifyPodcast(options: IngestOptions) {
  const {
    showId,
    bearerToken,
    headersFile,
    market = 'US',
    lang = 'en',
    maxEpisodes = 100,
    paragraphMin = 2,
    paragraphMax = 4,
    out = './out',
    vtt = false,
    srt = false
  } = options;

  try {
    log(`Starting Spotify podcast ingest for show: ${showId}`);

    // Step 1: Load authentication
    progress('Loading authentication configuration...');
    const authConfig = await loadAuthConfig({
      bearerToken,
      headersFile,
      market,
      lang
    });

    // Step 2: Fetch show info and episodes
    progress('Fetching show information...');
    const show = await getShow(showId, authConfig);
    log(`Show: "${show.title}" by ${show.publisher} (${show.total_episodes} episodes)`);

    progress('Fetching episodes from Spotify Web API...');
    const episodes = await getAllEpisodes(showId, authConfig, maxEpisodes);

    if (episodes.length === 0) {
      warn('No episodes found for this show');
      return { processed: 0, successful: 0, failed: 0 };
    }

    log(`Found ${episodes.length} episodes to process`);

    // Step 3: Process each episode
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < episodes.length; i++) {
      const episode = episodes[i];
      progress(`Processing episode ${i + 1}/${episodes.length}: "${episode.title}"`);

      try {
        await processEpisode(episode, {
          showId,
          lang,
          paragraphMin,
          paragraphMax,
          out,
          vtt,
          srt
        });
        
        successful++;
        log(`✅ Episode processed: ${episode.episode_id}`);

      } catch (episodeError: any) {
        failed++;
        error(`❌ Failed to process episode ${episode.episode_id}: ${episodeError.message}`);
        continue;
      }

      // Rate limiting between episodes
      if (i < episodes.length - 1) {
        await sleep(200);
      }
    }

    success(`Podcast ingest completed!`);
    log(`📊 Summary: ${successful} successful, ${failed} failed out of ${episodes.length} episodes`);
    
    return {
      processed: episodes.length,
      successful,
      failed,
      outputDir: out
    };

  } catch (err: any) {
    error(`Podcast ingest failed: ${err.message}`);
    throw err;
  }
}

async function processEpisode(
  episode: Episode,
  options: {
    showId: string;
    lang: string;
    paragraphMin: number;
    paragraphMax: number;
    out: string;
    vtt: boolean;
    srt: boolean;
  }
) {
  const { showId, lang, paragraphMin, paragraphMax, out, vtt, srt } = options;

  // Step 1: Fetch transcript
  const transcriptResult = await fetchEpisodeTranscript(
    episode.episode_id,
    episode.transcript_url,
    out
  );

  if (transcriptResult.segments.length === 0) {
    throw new Error('No transcript segments found');
  }

  // Step 2: Create chapters (default to single "Full" chapter for episodes)
  const chapters = createDefaultChapter(episode);

  // Step 3: Assign segments to chapters
  const segments = assignSegmentsToChapters(transcriptResult.segments, chapters);

  // Step 4: Create paragraphs
  const paragraphs = paragraphizeSegments(segments, {
    minSentences: paragraphMin,
    maxSentences: paragraphMax
  });

  // Step 5: Write canonical JSON
  const canonicalData = {
    episode,
    showId,
    chapters,
    segments,
    paragraphs,
    options: { language: lang }
  };

  await writeCanonicalJSON(canonicalData, out);

  // Step 6: Write optional subtitle files
  if (vtt) {
    await writeVTT(paragraphs, episode.episode_id, out);
  }
  if (srt) {
    await writeSRT(paragraphs, episode.episode_id, out);
  }
}

function assignSegmentsToChapters(
  segments: Array<{ start_s: number; end_s: number; text: string }>,
  chapters: Array<{ idx: number; start_s: number; end_s: number }>
) {
  return segments.map(segment => {
    // Find which chapter this segment belongs to
    const chapter = chapters.find(ch => 
      segment.start_s >= ch.start_s && segment.start_s < ch.end_s
    );
    
    return {
      ...segment,
      chapter_idx: chapter?.idx || 1
    };
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}