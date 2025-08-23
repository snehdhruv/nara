import { spoilerGuardian } from "./nodes/spoilerGuardian";
import { contextPacker } from "./nodes/contextPacker";
import { answerer } from "./nodes/answerer";
import type { ChapterTranscript } from "@/lib/types";

export interface ChapterQAInput {
  audiobookId: string;
  audiobookTitle: string;
  idx: number;
  chapterTitle: string;
  question: string;
  userId?: string;
  transcript?: ChapterTranscript;
  previousTranscripts?: ChapterTranscript[];
}

export interface ChapterQAOutput {
  answer: string;
  ok: boolean;
  reason?: string;
}

export const runChapterQA = async (input: ChapterQAInput): Promise<ChapterQAOutput> => {
  try {
    // Step 1: Spoiler Guardian
    const spoilerResult = await spoilerGuardian({
      audiobookId: input.audiobookId,
      idx: input.idx,
      question: input.question,
      userId: input.userId,
    });

    if (!spoilerResult.ok) {
      return {
        answer: spoilerResult.reason || "I'm sorry, I cannot answer this question due to spoiler protection.",
        ok: false,
        reason: spoilerResult.reason,
      };
    }

    // Step 2: Context Packer
    const contextResult = await contextPacker({
      audiobookId: input.audiobookId,
      idx: input.idx,
      filteredQuestion: spoilerResult.filteredQuestion,
      transcript: input.transcript,
      previousTranscripts: input.previousTranscripts,
    });

    // Step 3: Answerer
    const answerResult = await answerer({
      messages: contextResult.messages,
      audiobookTitle: input.audiobookTitle,
      chapterIdx: input.idx,
      chapterTitle: input.chapterTitle,
    });

    return {
      answer: answerResult.answer,
      ok: true,
    };

  } catch (error) {
    console.error("Chapter QA error:", error);
    return {
      answer: "I'm sorry, I encountered an error while processing your question. Please try again.",
      ok: false,
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
