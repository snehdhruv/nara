import type { ChapterTranscript } from "./types";

export const packChapterContent = (
  transcript: ChapterTranscript,
  previousChapterSummaries: string[] = []
) => {
  let transcriptText = "";

  if (transcript.text) {
    transcriptText = transcript.text;
  } else if (transcript.segments && transcript.segments.length > 0) {
    // Combine segments into readable text
    transcriptText = transcript.segments
      .map(segment => segment.text)
      .join(" ");
  } else {
    transcriptText = "[No transcript available]";
  }

  return {
    transcriptText: transcriptText.trim(),
    previousChapterSummaries,
  };
};

export const createPreviousChapterSummaries = (
  chapterSummaries: Array<{ idx: number; title: string; summary?: string }> = []
) => {
  return chapterSummaries
    .filter(chapter => chapter.summary)
    .map(chapter => `Chapter ${chapter.idx} - ${chapter.title}: ${chapter.summary}`);
};
