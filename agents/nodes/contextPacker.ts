import { packChapterContent, createPreviousChapterSummaries } from "@/lib/chapterPacking";
import type { ChapterTranscript } from "@/lib/types";

export interface ContextPackerInput {
  audiobookId: string;
  idx: number;
  filteredQuestion: string;
  transcript?: ChapterTranscript;
  previousTranscripts?: ChapterTranscript[];
}

export interface ContextPackerOutput {
  messages: Array<{ role: string; content: string }>;
  transcriptText: string;
}

export const contextPacker = async (input: ContextPackerInput): Promise<ContextPackerOutput> => {
  const { transcript, previousTranscripts = [] } = input;

  if (!transcript) {
    throw new Error("No transcript available for the requested chapter");
  }

  // Pack current chapter content
  const { transcriptText } = packChapterContent(transcript);

  // Create summaries of previous chapters (simplified for MVP)
  const previousSummaries = createPreviousChapterSummaries(
    previousTranscripts.map((t, i) => ({
      idx: i + 1,
      title: `Chapter ${i + 1}`,
      summary: t.text ? t.text.substring(0, 200) + "..." : undefined,
    }))
  );

  // Build messages for the LLM
  const messages = [
    {
      role: "user",
      content: `Context from chapter ${input.idx}:\n\n${transcriptText}\n\n${previousSummaries.length > 0 ? `Previous chapters summary:\n${previousSummaries.join('\n')}\n\n` : ''}Question: ${input.filteredQuestion}`,
    },
  ];

  return {
    messages,
    transcriptText,
  };
};
