import { z } from 'zod';

export const ChapterSchema = z.object({
  idx: z.number().int().positive(),
  title: z.string(),
  start_s: z.number().nonnegative(),
  end_s: z.number().positive()
});

export const SegmentSchema = z.object({
  chapter_idx: z.number().int().positive(),
  start_s: z.number().nonnegative(),
  end_s: z.number().positive(),
  text: z.string()
});

export const ParagraphSchema = z.object({
  chapter_idx: z.number().int().positive(),
  start_s: z.number().nonnegative(),
  end_s: z.number().positive(),
  text: z.string()
});

export const SourceSchema = z.object({
  platform: z.literal('youtube'),
  video_id: z.string(),
  title: z.string(),
  channel: z.string(),
  duration_s: z.number().positive(),
  rights: z.enum(['owner_ok', 'licensed', 'public_domain']),
  language: z.string(),
  captions_kind: z.enum(['human', 'auto'])
});

export const CanonicalJsonSchema = z.object({
  source: SourceSchema,
  chapters: z.array(ChapterSchema).min(1),
  segments: z.array(SegmentSchema),
  paragraphs: z.array(ParagraphSchema)
});

export type Chapter = z.infer<typeof ChapterSchema>;
export type Segment = z.infer<typeof SegmentSchema>;
export type Paragraph = z.infer<typeof ParagraphSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type CanonicalJson = z.infer<typeof CanonicalJsonSchema>;