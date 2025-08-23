import type { GraphState } from '../types';
import { SYSTEM_COMPRESS } from '../prompts';
import { getLLMClient } from '../llm-client';

export async function compressorNode(state: GraphState): Promise<Partial<GraphState>> {
  // Only run if mode is compressed
  if (state.packingMode !== 'compressed') {
    console.log('[Compressor] Skipping - mode is', state.packingMode);
    return {};
  }
  
  console.log('[Compressor] Compressing chapter to ~9000 tokens');
  
  if (!state.chapter?.segments) {
    throw new Error('Chapter segments not loaded');
  }
  
  // Join all segments
  const fullText = state.chapter.segments
    .map(s => s.text)
    .join(' ');
  
  const llm = getLLMClient();
  
  try {
    // Compress with LLM
    const compressed = await llm.complete({
      system: SYSTEM_COMPRESS(9000),
      messages: [{
        role: 'user',
        content: fullText
      }]
    });
    
    console.log('[Compressor] Compressed text length:', compressed.length);
    
    return {
      chapter: {
        ...state.chapter,
        text: compressed
      }
    };
  } catch (error) {
    console.error('[Compressor] Compression failed:', error);
    throw error;
  }
}