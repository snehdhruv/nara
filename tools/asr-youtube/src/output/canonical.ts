import { z } from 'zod';
import { safeWriteFile, ensureDir } from '../util/fsx.js';
import { log, success } from '../util/log.js';
import { join } from 'path';
import type { VideoMeta } from '../media/youtube.js';
import type { Chapter } from '../chapters/reconcile.js';
import type { TranscriptionSegment } from '../openai/whisper.js';
import type { ParagraphSegment } from '../text/paragraphize.js';

// Zod schemas for validation
const SourceSchema = z.object({
  platform: z.literal('youtube'),
  video_id: z.string(),
  title: z.string(),
  channel: z.string(),
  duration_s: z.number(),
  rights: z.string(),
  language: z.string(),
  captions_kind: z.literal('asr'),
  asr_provider: z.literal('openai'),
  asr_model: z.string()
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

export interface CanonicalData {
  videoMeta: VideoMeta;
  videoId: string;
  chapters: Chapter[];
  segments: Array<TranscriptionSegment & { chapter_idx: number }>;
  paragraphs: ParagraphSegment[];
  options: {
    language: string;
    rights: string;
    title?: string;
    asrModel: string;
  };
}

export async function writeCanonicalJSON(data: CanonicalData, outputDir: string): Promise<string> {
  const { videoMeta, videoId, chapters, segments, paragraphs, options } = data;
  
  // Build canonical structure
  const canonical = {
    source: {
      platform: 'youtube' as const,
      video_id: videoId,
      title: options.title || videoMeta.title,
      channel: videoMeta.channel,
      duration_s: videoMeta.duration_s,
      rights: options.rights,
      language: options.language,
      captions_kind: 'asr' as const,
      asr_provider: 'openai' as const,
      asr_model: options.asrModel
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
  const filePath = join(outputDir, `${videoId}.json`);
  const jsonContent = JSON.stringify(canonical, null, 2);
  
  await safeWriteFile(filePath, jsonContent);
  
  success(`Canonical JSON saved: ${filePath}`);
  log(`  - ${chapters.length} chapters`);
  log(`  - ${segments.length} segments`);
  log(`  - ${paragraphs.length} paragraphs`);
  
  return filePath;
}