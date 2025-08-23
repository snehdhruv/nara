import { readFileSync, existsSync } from 'fs';
import type { GraphState, CanonicalTranscript } from '../types';

export async function chapterLoaderNode(state: GraphState): Promise<Partial<GraphState>> {
  console.log('[ChapterLoader] Loading dataset from transcript data object');
  
  // Use transcript data from state (passed directly instead of reading from file)
  const transcriptData = state.transcriptData;
  
  if (!transcriptData) {
    throw new Error('[ChapterLoader] No transcript data provided in state');
  }
  
  // Find the allowed chapter - data is 1-indexed, so we need to find by idx field
  const chapterIdx = state.allowedIdx ?? 0;
  const chapter = transcriptData.chapters.find(ch => ch.idx === chapterIdx);
  
  if (!chapter) {
    throw new Error(`Chapter with idx ${chapterIdx} not found. Available chapters: ${transcriptData.chapters.map(ch => ch.idx).join(', ')}`);
  }
  
  // Filter segments for this chapter
  const chapterSegments = transcriptData.segments.filter(s => s.chapter_idx === chapterIdx);
  
  if (chapterSegments.length === 0) {
    throw new Error(`No segments found for chapter ${chapterIdx}. Available chapter_idx values: ${Array.from(new Set(transcriptData.segments.map(s => s.chapter_idx))).join(', ')}`);
  }
  
  console.log(`[ChapterLoader] Loaded chapter ${chapterIdx}: "${chapter.title}" with ${chapterSegments.length} segments`);
  
  // Load prior summaries if requested and datasetPath is available
  let priorSummaries = undefined;
  if (state.includePriorSummaries && chapterIdx > 0 && state.datasetPath) {
    const summariesPath = state.datasetPath.replace('.json', '.summaries.json');
    if (existsSync(summariesPath)) {
      try {
        const allSummaries = JSON.parse(readFileSync(summariesPath, 'utf-8'));
        // Get last 3 summaries before current chapter
        const startIdx = Math.max(0, chapterIdx - 3);
        priorSummaries = allSummaries
          .slice(startIdx, chapterIdx)
          .map((summary: any) => ({
            idx: summary.idx,
            title: summary.title,
            summary: summary.summary
          }));
        console.log(`[ChapterLoader] Loaded ${priorSummaries.length} prior summaries`);
      } catch (e) {
        console.log('[ChapterLoader] Could not load summaries:', e);
      }
    }
  }
  
  return {
    chapter: {
      idx: chapterIdx,
      title: chapter.title,
      segments: chapterSegments
    },
    priorSummaries
  };
}