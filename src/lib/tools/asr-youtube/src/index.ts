import { getVideoMeta, extractAudioTemp } from './media/youtube';
import { transcribeAudio } from './openai/whisper';
import { reconcileChapters } from './chapters/reconcile';
import { paragraphizeSegments } from './text/paragraphize';
import { writeCanonicalJSON } from './output/canonical';
import { writeVTT } from './output/vtt';
import { writeSRT } from './output/srt';
import { log, progress, success, error } from './util/log';

export interface TranscribeOptions {
  url: string;
  lang?: string;
  paragraphMin?: number;
  paragraphMax?: number;
  out?: string;
  title?: string;
  rights?: string;
  vtt?: boolean;
  srt?: boolean;
  asrModel?: string;
}

export async function transcribeYouTubeVideo(options: TranscribeOptions) {
  const {
    url,
    lang = 'en',
    paragraphMin = 2,
    paragraphMax = 4,
    out = './out',
    title,
    rights = 'owner_ok',
    vtt = false,
    srt = false,
    asrModel = 'whisper-1'
  } = options;

  try {
    // Extract video ID
    const videoId = extractVideoId(url);
    log(`Starting ASR transcription for video: ${videoId}`);

    // Step 1: Get video metadata
    progress('Fetching video metadata...');
    const videoMeta = await getVideoMeta(videoId);
    log(`Video: "${videoMeta.title}" by ${videoMeta.channel} (${videoMeta.duration_s}s)`);

    // Step 2: Reconcile chapters
    progress('Determining chapters...');
    const chapters = reconcileChapters({ videoMeta });
    log(`Using ${chapters.length} chapters`);

    // Step 3: Extract audio
    progress('Extracting audio...');
    const audioFile = await extractAudioTemp(videoId);

    let segments, paragraphs;
    try {
      // Step 4: Transcribe with Whisper
      progress('Transcribing with OpenAI Whisper...');
      const transcriptionSegments = await transcribeAudio({
        path: audioFile.path,
        lang,
        model: asrModel
      });

      // Step 5: Assign segments to chapters
      progress('Assigning segments to chapters...');
      segments = assignSegmentsToChapters(transcriptionSegments, chapters);
      log(`Assigned ${segments.length} segments to chapters`);

      // Step 6: Create paragraphs
      progress('Creating paragraphs...');
      paragraphs = paragraphizeSegments(segments, {
        minSentences: paragraphMin,
        maxSentences: paragraphMax
      });

    } finally {
      // Always cleanup temp audio file
      await audioFile.cleanup();
    }

    // Step 7: Write canonical JSON
    progress('Writing output files...');
    const canonicalData = {
      videoMeta,
      videoId,
      chapters,
      segments,
      paragraphs,
      options: {
        language: lang,
        rights,
        title,
        asrModel
      }
    };

    const jsonPath = await writeCanonicalJSON(canonicalData, out);

    // Step 8: Write optional subtitle files
    if (vtt) {
      await writeVTT(paragraphs, videoId, out);
    }
    if (srt) {
      await writeSRT(paragraphs, videoId, out);
    }

    success(`Transcription completed successfully!`);
    log(`Output files written to: ${out}/`);
    
    return {
      videoId,
      jsonPath,
      segments: segments.length,
      paragraphs: paragraphs.length,
      chapters: chapters.length,
      duration: videoMeta.duration_s
    };

  } catch (err: any) {
    error(`Transcription failed: ${err.message}`);
    throw err;
  }
}

function extractVideoId(url: string): string {
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  throw new Error(`Invalid YouTube URL or video ID: ${url}`);
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