import type { GraphState } from '../types';

export async function postProcessNode(state: GraphState): Promise<Partial<GraphState>> {
  console.log('[PostProcess] Determining playback hint');
  
  if (!state.chapter) {
    throw new Error('Chapter not loaded');
  }
  
  let start_s = 0;
  
  // Try to extract time from citations
  if (state.answer?.citations && state.answer.citations.length > 0) {
    for (const citation of state.answer.citations) {
      if (citation.type === 'time' && citation.ref) {
        // Parse time reference like [t=02:45] or [t=MM:SS]
        const match = citation.ref.match(/\[t=(\d{1,2}):(\d{2})\]/);
        if (match) {
          const minutes = parseInt(match[1]);
          const seconds = parseInt(match[2]);
          start_s = minutes * 60 + seconds;
          console.log('[PostProcess] Found time citation:', citation.ref, '-> seconds:', start_s);
          break;
        }
      }
    }
  }
  
  // If no time found, check if we have focused segments
  if (start_s === 0 && state.packingMode === 'focused' && state.chapter.segments?.length) {
    // Use the start of the first selected segment
    start_s = state.chapter.segments[0].start_s;
  }
  
  const playbackHint = {
    chapter_idx: state.chapter.idx,
    start_s
  };
  
  console.log('[PostProcess] Playback hint:', playbackHint);
  
  return {
    playbackHint
  };
}