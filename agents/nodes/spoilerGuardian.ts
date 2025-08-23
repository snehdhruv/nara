import { SPOILER_GUARDIAN_SYSTEM_PROMPT } from "@/lib/prompts";

export interface SpoilerGuardianInput {
  audiobookId: string;
  idx: number;
  question: string;
  userId?: string;
}

export interface SpoilerGuardianOutput {
  ok: boolean;
  reason?: string;
  filteredQuestion: string;
}

export const spoilerGuardian = async (input: SpoilerGuardianInput): Promise<SpoilerGuardianOutput> => {
  // Simple heuristic-based spoiler detection
  // In a real implementation, this would use an LLM to analyze the question

  const question = input.question.toLowerCase();
  const currentChapter = input.idx;

  // Keywords that might indicate spoiler-seeking questions
  const spoilerKeywords = [
    'what happens in chapter',
    'does x die',
    'who dies',
    'ending',
    'finale',
    'conclusion',
    'resolution',
    'outcome',
    'result',
    'twist',
    'reveal',
    'secret',
    'surprise',
    'spoiler',
    'future',
    'later',
    'next chapter',
    'chapter ' + (currentChapter + 1),
    'chapter ' + (currentChapter + 2),
    'chapter ' + (currentChapter + 3),
  ];

  const containsSpoilerKeyword = spoilerKeywords.some(keyword => question.includes(keyword));

  if (containsSpoilerKeyword) {
    return {
      ok: false,
      reason: `This question appears to ask about content beyond chapter ${currentChapter}. I can only answer questions about chapter ${currentChapter} and earlier.`,
      filteredQuestion: `Tell me about chapter ${currentChapter} and what has happened so far.`,
    };
  }

  // Check for explicit chapter references beyond current
  const chapterMatch = question.match(/chapter (\d+)/i);
  if (chapterMatch) {
    const requestedChapter = parseInt(chapterMatch[1]);
    if (requestedChapter > currentChapter) {
      return {
        ok: false,
        reason: `You asked about chapter ${requestedChapter}, but I can only discuss up to chapter ${currentChapter}.`,
        filteredQuestion: `Tell me about chapter ${currentChapter} and what has happened so far.`,
      };
    }
  }

  return {
    ok: true,
    filteredQuestion: input.question,
  };
};
