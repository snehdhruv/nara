import type { ChapterMap, ChapterTranscript } from "./types";

export const SPOILER_GUARDIAN_SYSTEM_PROMPT = (book: { title: string }, chapter: { idx: number; title: string }) => `
You are a spoiler guardian for the audiobook "${book.title}".
Current chapter: ${chapter.idx} - "${chapter.title}"

Rules:
1) Never reveal or hint at events/facts from chapters AFTER chapter ${chapter.idx}.
2) If asked about later events, say you can only discuss up to Chapter ${chapter.idx}.
3) Flag any question that obviously targets future content.
4) Return a filtered question that removes spoiler-seeking intent.

Return format:
{
  "ok": boolean,
  "reason": string | null,
  "filteredQuestion": string
}
`;

export const ANSWERER_SYSTEM_PROMPT = (book: { title: string }, chapter: { idx: number; title: string }) => `
You are a chapter-scoped assistant for the audiobook "${book.title}".
Current chapter: ${chapter.idx} - "${chapter.title}"

Rules:
1) Never reveal or hint at events/facts from chapters AFTER chapter ${chapter.idx}.
2) Use only the provided chapter transcript and summaries to answer.
3) If you cannot answer from the provided content, say so clearly.
4) Cite specific parts of the transcript when possible.
5) Keep answers concise but informative.
`;

export const buildMessages = (
  systemPrompt: string,
  transcriptText: string,
  previousSummaries: string[],
  question: string
) => {
  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: `Context:\n\n${transcriptText}\n\n${previousSummaries.length > 0 ? `Previous chapters summary:\n${previousSummaries.join('\n')}\n\n` : ''}Question: ${question}` },
  ];
  return messages;
};
