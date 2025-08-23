import type { GraphState, AnthropicMessage, LLMResponse } from '../types';
import { getLLMClient } from '../llm-client';
import { SYSTEM_GLOBAL, SYSTEM_ANSWERER } from '../prompts';
import { readFileSync } from 'fs';

function extractCitationsFromText(text: string): Array<{ type: 'para' | 'time'; ref: string }> {
  const citations: Array<{ type: 'para' | 'time'; ref: string }> = [];
  
  // Extract time references like [t=02:45] or [t=MM:SS]
  const timeMatches1 = text.match(/\[t=\d{1,2}:\d{2}\]/g) || [];
  for (const match of timeMatches1) {
    citations.push({ type: 'time', ref: match });
  }
  
  // Extract time references like [8:00] or [MM:SS] (without t=)
  const timeMatches2 = text.match(/\[\d{1,2}:\d{2}\]/g) || [];
  for (const match of timeMatches2) {
    // Convert to standard format [t=MM:SS]
    const standardFormat = match.replace(/\[(\d{1,2}:\d{2})\]/, '[t=$1]');
    citations.push({ type: 'time', ref: standardFormat });
  }
  
  // Extract paragraph references like [p1] or [para1]  
  const paraMatches = text.match(/\[(p|para)\d+\]/g) || [];
  for (const match of paraMatches) {
    citations.push({ type: 'para', ref: match });
  }
  
  return citations;
}

export async function answererNode(state: GraphState): Promise<Partial<GraphState>> {
  console.log('[Answerer] Generating answer');
  
  if (!state.packedMessages || !state.chapter) {
    throw new Error('Messages not packed');
  }
  
  const llm = getLLMClient();
  
  // Load book title for system prompt
  const transcriptData = JSON.parse(readFileSync(state.datasetPath, 'utf-8'));
  const bookTitle = transcriptData.source.title;
  
  const systemPrompt = SYSTEM_GLOBAL + '\n\n' + 
    SYSTEM_ANSWERER(bookTitle, state.chapter.idx, state.chapter.title);
  
  try {
    // Call Claude 4.1
    const response = await llm.complete({
      system: systemPrompt,
      messages: state.packedMessages as AnthropicMessage[]
    });
    
    // Try to parse as JSON first, fallback to extracting citations from text
    let parsed: LLMResponse;
    try {
      parsed = JSON.parse(response) as LLMResponse;
      console.log('[Answerer] Generated JSON answer with', parsed.citations?.length || 0, 'citations');
    } catch (jsonError) {
      // If not JSON, extract citations from the text
      console.log('[Answerer] Generated plain text answer, extracting citations');
      const citations = extractCitationsFromText(response);
      parsed = {
        answer_markdown: response,
        citations: citations
      };
    }
    
    return {
      answer: {
        markdown: parsed.answer_markdown || response,
        citations: parsed.citations || []
      }
    };
  } catch (error) {
    console.error('[Answerer] LLM call failed:', error);
    throw error;
  }
}