import { z } from 'zod';
import { safeWriteFile, ensureDir } from '../util/fsx.js';
import { log, success } from '../util/log.js';
import { join } from 'path';
import type { Episode } from '../pathfinder/episodes.js';
import type { TranscriptSegment } from '../transcripts/proto/decode.js';
import type { ParagraphSegment } from '../text/paragraphize.js';

// Zod schemas for validation
const SourceSchema = z.object({
  platform: z.literal('spotify'),
  show_id: z.string(),
  episode_id: z.string(),
  title: z.string(),
  duration_s: z.number(),
  language: z.string(),
  captions_kind: z.literal('transcript_protobuf'),
  asr_provider: z.null(),
  asr_model: z.null()
});

const ChapterSchema = z.object({
  idx: z.number(),
  title: z.string(),
  start_s: z.number(),
  end_s: z.number()
});

const SegmentSchema = z.object({
  chapter_idx: z.number(),
  start_s: z.number(),
  end_s: z.number(),
  text: z.string()
});

const ParagraphSchema = z.object({
  chapter_idx: z.number(),
  start_s: z.number(),
  end_s: z.number(),
  text: z.string()
});

const CanonicalSchema = z.object({
  source: SourceSchema,
  chapters: z.array(ChapterSchema),
  segments: z.array(SegmentSchema),
  paragraphs: z.array(ParagraphSchema)
});

export interface Chapter {
  idx: number;
  title: string;
  start_s: number;
  end_s: number;
}

export interface CanonicalData {
  episode: Episode;
  showId: string;
  chapters: Chapter[];
  segments: Array<TranscriptSegment & { chapter_idx: number }>;
  paragraphs: ParagraphSegment[];
  options: {
    language: string;
  };
}

export async function writeCanonicalJSON(data: CanonicalData, outputDir: string): Promise<string> {
  const { episode, showId, chapters, segments, paragraphs, options } = data;
  
  // Build canonical structure
  const canonical = {
    source: {
      platform: 'spotify' as const,
      show_id: showId,
      episode_id: episode.episode_id,
      title: episode.title,
      duration_s: Math.round(episode.duration_ms / 1000),
      language: options.language,
      captions_kind: 'transcript_protobuf' as const,
      asr_provider: null,
      asr_model: null
    },
    chapters: chapters.map(ch => ({
      idx: ch.idx,
      title: ch.title,
      start_s: ch.start_s,
      end_s: ch.end_s
    })),
    segments: segments.map(seg => ({
      chapter_idx: seg.chapter_idx,
      start_s: seg.start_s,
      end_s: seg.end_s,
      text: seg.text
    })),
    paragraphs: paragraphs.map(para => ({
      chapter_idx: para.chapter_idx,
      start_s: para.start_s,
      end_s: para.end_s,
      text: para.text
    }))
  };
  
  // Validate against schema
  try {
    CanonicalSchema.parse(canonical);
  } catch (error) {
    throw new Error(`Canonical JSON validation failed: ${error}`);
  }
  
  // Write to file
  await ensureDir(outputDir);
  const filePath = join(outputDir, `${episode.episode_id}.json`);
  const jsonContent = JSON.stringify(canonical, null, 2);
  
  await safeWriteFile(filePath, jsonContent);
  
  success(`Canonical JSON saved: ${filePath}`);
  log(`  - ${chapters.length} chapters`);
  log(`  - ${segments.length} segments`);
  log(`  - ${paragraphs.length} paragraphs`);
  
  return filePath;
}

export function createDefaultChapter(episode: Episode): Chapter[] {
  return [{
    idx: 1,
    title: 'Full',
    start_s: 0,
    end_s: Math.round(episode.duration_ms / 1000)
  }];
}