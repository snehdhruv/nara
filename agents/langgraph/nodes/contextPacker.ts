import type { GraphState } from '../types';
import { SYSTEM_GLOBAL, SYSTEM_ANSWERER } from '../prompts';
import { buildMessages, paragraphsFromSegments, formatTimeTag } from '../packers';
import { readFileSync } from 'fs';

export async function contextPackerNode(state: GraphState): Promise<Partial<GraphState>> {
  console.log('[ContextPacker] Packing context for mode:', state.packingMode);
  
  if (!state.chapter) {
    throw new Error('Chapter not loaded');
  }
  
  // Load book title from dataset
  const transcriptData = JSON.parse(readFileSync(state.datasetPath, 'utf-8'));
  const bookTitle = transcriptData.source.title;
  
  // Build chapter content based on mode
  let chapterBlock = '';
  
  if (state.packingMode === 'full' && state.chapter.segments) {
    // Full mode: concatenate paragraphs with time tags
    const paragraphs = paragraphsFromSegments(state.chapter.segments);
    chapterBlock = paragraphs.map((para, idx) => {
      // Add time tag from first segment of paragraph (approximation)
      const segmentIdx = Math.floor((idx / paragraphs.length) * state.chapter.segments!.length);
      const segment = state.chapter.segments![segmentIdx];
      const timeTag = formatTimeTag(segment.start_s);
      return `${timeTag} ${para}`;
    }).join('\n\n');
    
  } else if (state.packingMode === 'compressed' && state.chapter.text) {
    // Compressed mode: use compressed text
    chapterBlock = state.chapter.text;
    
  } else if (state.packingMode === 'focused' && state.chapter.segments) {
    // Focused mode: selected paragraphs only
    const paragraphs = paragraphsFromSegments(state.chapter.segments);
    chapterBlock = paragraphs.map((para, idx) => {
      const segmentIdx = Math.floor((idx / paragraphs.length) * state.chapter.segments!.length);
      const segment = state.chapter.segments![segmentIdx];
      const timeTag = formatTimeTag(segment.start_s);
      return `${timeTag} ${para}`;
    }).join('\n\n');
  }
  
  // Format prior summaries
  const priorBullets = state.priorSummaries?.map(s => 
    `- Chapter ${s.idx}: ${s.title}\n  ${s.summary}`
  );
  
  // Build messages
  const systemPerCall = SYSTEM_ANSWERER(bookTitle, state.chapter.idx, state.chapter.title);
  
  const messages = buildMessages({
    systemGlobal: SYSTEM_GLOBAL,
    systemPerCall,
    question: state.question,
    chapterBlock,
    priorBullets
  });
  
  console.log('[ContextPacker] Packed', messages.length, 'messages');
  
  return {
    packedMessages: messages
  };
}