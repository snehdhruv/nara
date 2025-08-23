import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { z } from "zod";

const ChapterMapSchema = z.object({
  audiobook: z.object({
    id: z.string(),
    title: z.string(),
    language: z.string(),
    spotifyAudiobookUri: z.string().optional(),
  }),
  chapters: z.array(z.object({
    idx: z.number(),
    title: z.string(),
    spotifyChapterUri: z.string().optional(),
    startMs: z.number().nullable().optional(),
    endMs: z.number().nullable().optional(),
  })),
});

const ChapterTranscriptSchema = z.object({
  audiobookId: z.string(),
  idx: z.number(),
  text: z.string().optional(),
  segments: z.array(z.object({
    startMs: z.number(),
    endMs: z.number(),
    text: z.string(),
  })).optional(),
  rights: z.union([
    z.literal("public_domain"),
    z.literal("owner_ok"),
    z.literal("website_transcript"),
    z.literal("unknown"),
  ]),
});

export const bulkIngest = mutation({
  args: {
    chapterMap: v.any(), // We'll validate with Zod
    transcripts: v.array(v.any()), // We'll validate with Zod
  },
  handler: async (ctx, args) => {
    // Validate input data
    const validatedMap = ChapterMapSchema.parse(args.chapterMap);
    const validatedTranscripts = args.transcripts.map(t => ChapterTranscriptSchema.parse(t));

    // Create or update audiobook
    const { upsert: upsertAudiobook } = await import("./audiobooks");
    const audiobookId = await upsertAudiobook.default(ctx, {
      slug: validatedMap.audiobook.id,
      title: validatedMap.audiobook.title,
      language: validatedMap.audiobook.language,
      spotifyAudiobookUri: validatedMap.audiobook.spotifyAudiobookUri,
    });

    // Create or update chapters
    const { upsertMap: upsertChapterMap } = await import("./chapters");
    await upsertChapterMap.default(ctx, {
      audiobookId: audiobookId as any, // Cast to match expected type
      chapters: validatedMap.chapters,
    });

    // Create or update transcripts
    const { upsert: upsertTranscript } = await import("./transcripts");
    for (const transcript of validatedTranscripts) {
      await upsertTranscript.default(ctx, {
        audiobookId: audiobookId as any, // Cast to match expected type
        ...transcript,
      });
    }

    return {
      success: true,
      audiobookId,
      chaptersCount: validatedMap.chapters.length,
      transcriptsCount: validatedTranscripts.length,
    };
  },
});
