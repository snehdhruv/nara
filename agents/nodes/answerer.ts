import { ANSWERER_SYSTEM_PROMPT } from "@/lib/prompts";

export interface AnswererInput {
  messages: Array<{ role: string; content: string }>;
  audiobookTitle: string;
  chapterIdx: number;
  chapterTitle: string;
}

export interface AnswererOutput {
  answer: string;
  citations?: Array<{ text: string; startMs?: number; endMs?: number }>;
}

export const answerer = async (input: AnswererInput): Promise<AnswererOutput> => {
  const systemPrompt = ANSWERER_SYSTEM_PROMPT(
    { title: input.audiobookTitle },
    { idx: input.chapterIdx, title: input.chapterTitle }
  );

  const messages = [
    { role: "system", content: systemPrompt },
    ...input.messages,
  ];

  // Call Anthropic API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      messages,
      temperature: 0.1, // Low temperature for factual answers
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return {
    answer: data.content[0].text,
    citations: [], // Could extract citations from the response
  };
};
