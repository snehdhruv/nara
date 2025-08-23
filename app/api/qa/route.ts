import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runChapterQA } from "@/agents/graph";
import { convex } from "@/lib/convex";

const QARequestSchema = z.object({
  audiobookId: z.string(),
  idx: z.number(),
  question: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = QARequestSchema.parse(body);

    // Get audiobook info
    const audiobook = await convex.query("audiobooks", "getBySlug", {
      slug: validatedData.audiobookId,
    });

    if (!audiobook) {
      return NextResponse.json(
        { error: "Audiobook not found" },
        { status: 404 }
      );
    }

    // Get chapter info
    const chapter = await convex.query("chapters", "get", {
      audiobookId: audiobook._id,
      idx: validatedData.idx,
    });

    if (!chapter) {
      return NextResponse.json(
        { error: "Chapter not found" },
        { status: 404 }
      );
    }

    // Get transcript
    const transcript = await convex.query("transcripts", "getByChapter", {
      audiobookId: audiobook._id,
      idx: validatedData.idx,
    });

    // For MVP, we'll skip previous transcripts to keep it simple
    const result = await runChapterQA({
      audiobookId: validatedData.audiobookId,
      audiobookTitle: audiobook.title,
      idx: validatedData.idx,
      chapterTitle: chapter.title,
      question: validatedData.question,
      transcript: transcript ? {
        audiobookId: transcript.audiobookId,
        idx: transcript.idx,
        text: transcript.text,
        segments: transcript.segments,
        rights: transcript.rights,
      } : undefined,
      previousTranscripts: [],
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error("QA API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
