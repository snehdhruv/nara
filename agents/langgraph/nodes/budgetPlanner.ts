import type { GraphState } from '../types';
import { estimateTokens, decideMode } from '../budget';

export async function budgetPlannerNode(state: GraphState): Promise<Partial<GraphState>> {
  console.log('[BudgetPlanner] Starting with budget:', state.tokenBudget);
  
  if (!state.chapter) {
    throw new Error('Chapter not loaded');
  }
  
  // Estimate tokens for full chapter
  const fullChapterText = state.chapter.segments
    ?.map(s => s.text)
    .join(' ') || '';
  
  const chapterTokens = estimateTokens(fullChapterText);
  console.log('[BudgetPlanner] Chapter tokens:', chapterTokens);
  
  // Decide packing mode
  const packingMode = decideMode({
    chapterTokens,
    budget: state.tokenBudget,
    hint: state.modeHint
  });
  
  console.log('[BudgetPlanner] Selected mode:', packingMode);
  
  return {
    packingMode
  };
}