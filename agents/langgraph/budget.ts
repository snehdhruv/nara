export function estimateTokens(text: string): number {
  // Simple heuristic: ~0.25 * character count
  // More accurate would be using a tokenizer library
  return Math.ceil(text.length * 0.25);
}

export function decideMode(params: {
  chapterTokens: number;
  budget: number;
  hint: 'auto' | 'full' | 'compressed' | 'focused';
}): 'full' | 'compressed' | 'focused' {
  const { chapterTokens, budget, hint } = params;
  
  // If hint is not auto, use it directly
  if (hint !== 'auto') {
    return hint;
  }
  
  // Auto mode decision based on token count
  // Leave ~20k headroom for system prompts and answer
  const effectiveBudget = budget - 20000;
  
  if (chapterTokens <= 50000) {
    return 'full';
  } else if (chapterTokens <= 100000) {
    return 'compressed';
  } else {
    return 'focused';
  }
}