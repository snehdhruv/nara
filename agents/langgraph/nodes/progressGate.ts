import type { GraphState } from '../types';

export async function progressGateNode(state: GraphState): Promise<Partial<GraphState>> {
  console.log('[ProgressGate] Starting - playback:', state.playbackChapterIdx, 'progress:', state.userProgressIdx);
  
  // Set allowed index to minimum of playback and progress
  const allowedIdx = Math.min(state.playbackChapterIdx, state.userProgressIdx);
  
  console.log('[ProgressGate] Allowed chapter index:', allowedIdx);
  
  return {
    allowedIdx
  };
}