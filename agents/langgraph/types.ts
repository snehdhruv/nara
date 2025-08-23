import { z } from 'zod';

// Dataset schemas
export const AudiobookSource = z.object({
  platform: z.enum(["youtube", "spotify", "audible", "http", "file"]),
  video_id: z.string().optional(),
  title: z.string(),
  channel: z.string().optional(),
  duration_s: z.number(),
  rights: z.string(),
  language: z.string().default("en"),
  captions_kind: z.string(),
  asr_provider: z.string().nullable().optional(),
  asr_model: z.string().nullable().optional()
});

export const Chapter = z.object({
  idx: z.number(),
  title: z.string(),
  start_s: z.number(),
  end_s: z.number()
});

export const Segment = z.object({
  chapter_idx: z.number(),
  start_s: z.number(),
  end_s: z.number(),
  text: z.string()
});

export const Paragraph = Segment;

export const CanonicalTranscript = z.object({
  source: AudiobookSource,
  chapters: z.array(Chapter).min(1),
  segments: z.array(Segment).min(1),
  paragraphs: z.array(Paragraph).optional()
});

// Graph state schemas
export const GraphInput = z.object({
  datasetPath: z.string(),
  audiobookId: z.string().default("default"),
  question: z.string(),
  playbackChapterIdx: z.number(),
  userProgressIdx: z.number().default(1),
  modeHint: z.enum(["auto", "full", "compressed", "focused"]).default("auto"),
  tokenBudget: z.number().default(180000),
  includePriorSummaries: z.boolean().default(true)
});

export const GraphState = z.object({
  ...GraphInput.shape,
  allowedIdx: z.number().optional(),
  chapter: z.object({
    idx: z.number(),
    title: z.string(),
    text: z.string().optional(),
    segments: z.array(Segment).optional()
  }).optional(),
  priorSummaries: z.array(z.object({
    idx: z.number(),
    title: z.string(),
    summary: z.string()
  })).optional(),
  packingMode: z.enum(["full", "compressed", "focused"]).optional(),
  packedMessages: z.any().optional(),
  answer: z.object({
    markdown: z.string(),
    citations: z.array(z.object({
      type: z.enum(["para", "time"]),
      ref: z.string()
    })).default([])
  }).optional(),
  playbackHint: z.object({
    chapter_idx: z.number(),
    start_s: z.number().default(0)
  }).optional(),
  notes: z.string().optional()
});

// Type exports
export type AudiobookSource = z.infer<typeof AudiobookSource>;
export type Chapter = z.infer<typeof Chapter>;
export type Segment = z.infer<typeof Segment>;
export type Paragraph = z.infer<typeof Paragraph>;
export type CanonicalTranscript = z.infer<typeof CanonicalTranscript>;
export type GraphInput = z.infer<typeof GraphInput>;
export type GraphState = z.infer<typeof GraphState>;

// LLM message types
export interface AnthropicMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  answer_markdown?: string;
  citations?: Array<{ type: 'para' | 'time'; ref: string }>;
  keywords?: string[];
  compressed?: string;
}