import type { GraphState, LLMResponse } from '../types';
import { SYSTEM_FOCUS } from '../prompts';
import { selectByKeywords } from '../packers';
import { getLLMClient } from '../llm-client';

export async function focusedSelectorNode(state: GraphState): Promise<Partial<GraphState>> {
  // Only run if mode is focused
  if (state.packingMode !== 'focused') {
    console.log('[FocusedSelector] Skipping - mode is', state.packingMode);
    return {};
  }
  
  console.log('[FocusedSelector] Extracting keywords for focused retrieval');
  
  if (!state.chapter?.segments) {
    throw new Error('Chapter segments not loaded');
  }
  
  const llm = getLLMClient();
  
  try {
    // Get keywords from LLM
    const response = await llm.complete({
      system: SYSTEM_FOCUS,
      messages: [{
        role: 'user',
        content: state.question
      }]
    });
    
    const parsed = JSON.parse(response) as string[];
    const keywords = parsed.slice(0, 12); // Max 12 keywords
    
    console.log('[FocusedSelector] Keywords:', keywords);
    
    // Select segments by keywords
    const selectedSegments = selectByKeywords(state.chapter.segments, keywords);
    
    console.log(`[FocusedSelector] Selected ${selectedSegments.length} segments from ${state.chapter.segments.length}`);
    
    return {
      chapter: {
        ...state.chapter,
        segments: selectedSegments
      }
    };
  } catch (error) {
    console.error('[FocusedSelector] LLM call failed:', error);
    throw error;
  }
}