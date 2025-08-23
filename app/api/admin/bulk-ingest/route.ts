import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { convex } from "@/lib/convex";

const BulkIngestRequestSchema = z.object({
  chapterMap: z.object({
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
  }),
  transcripts: z.array(z.object({
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
  })),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = BulkIngestRequestSchema.parse(body);

    // Upsert audiobook
    const audiobookId = await convex.mutation("audiobooks", "upsert", {
      slug: validatedData.chapterMap.audiobook.id,
      title: validatedData.chapterMap.audiobook.title,
      language: validatedData.chapterMap.audiobook.language,
      spotifyAudiobookUri: validatedData.chapterMap.audiobook.spotifyAudiobookUri,
    });

    // Upsert chapters
    await convex.mutation("chapters", "upsertMap", {
      audiobookId: audiobookId as any,
      chapters: validatedData.chapterMap.chapters,
    });

    // Upsert transcripts
    for (const transcript of validatedData.transcripts) {
      await convex.mutation("transcripts", "upsert", {
        audiobookId: audiobookId as any,
        idx: transcript.idx,
        text: transcript.text,
        segments: transcript.segments,
        rights: transcript.rights,
      });
    }

    return NextResponse.json({
      success: true,
      audiobookId,
      chaptersCount: validatedData.chapterMap.chapters.length,
      transcriptsCount: validatedData.transcripts.length,
    });

  } catch (error) {
    console.error("Bulk ingest error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Bulk ingest failed",
        success: false,
      },
      { status: 500 }
    );
  }
}
