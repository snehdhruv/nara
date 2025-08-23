/**
 * LangGraph Runner - Adapter for runChapterQA with AbortSignal support
 * Provides a clean interface for the Voice Agent Bridge
 */

import { runChapterQA } from '../graph';
import { GraphInput } from '../types';

export interface RunnerInput {
  datasetPath: string;
  audiobookId: string;
  question: string;
  playbackChapterIdx: number;
  userProgressIdx: number;
  modeHint?: "auto" | "full" | "compressed" | "focused";
  tokenBudget?: number;
  signal?: AbortSignal;
}

export interface RunnerOutput {
  answer_markdown: string;
  citations: Array<{ type: 'para' | 'time'; ref: string }>;
  playbackHint?: { chapter_idx: number; start_s: number };
  latency_ms: number;
}

export class LangGraphRunner {
  private runChapterQA: typeof runChapterQA;

  constructor(runChapterQAFn: typeof runChapterQA) {
    this.runChapterQA = runChapterQAFn;
  }

  async ask(input: RunnerInput): Promise<RunnerOutput> {
    const startTime = performance.now();

    // Check if already aborted
    if (input.signal?.aborted) {
      throw new Error('Request aborted before starting');
    }

    // Set up abort handling
    let timeoutId: NodeJS.Timeout | null = null;
    const abortPromise = new Promise<never>((_, reject) => {
      if (input.signal) {
        if (input.signal.aborted) {
          reject(new Error('Request aborted'));
          return;
        }

        const onAbort = () => {
          if (timeoutId) clearTimeout(timeoutId);
          reject(new Error('Request aborted'));
        };

        input.signal.addEventListener('abort', onAbort, { once: true });
      }
    });

    // Set up timeout (30 seconds for LLM requests)
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Request timed out after 30 seconds'));
      }, 30000);
    });

    // Prepare GraphInput for LangGraph
    const graphInput: GraphInput = {
      datasetPath: input.datasetPath,
      audiobookId: input.audiobookId,
      question: input.question,
      playbackChapterIdx: input.playbackChapterIdx,
      userProgressIdx: input.userProgressIdx,
      modeHint: input.modeHint ?? "auto",
      tokenBudget: input.tokenBudget ?? 180000,
      includePriorSummaries: true
    };

    try {
      // Race between the actual request, timeout, and abort
      const result = await Promise.race([
        this.runChapterQA(graphInput),
        abortPromise,
        timeoutPromise
      ]);

      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      console.log(`[LangGraphRunner] QA completed in ${latencyMs}ms`);

      return {
        answer_markdown: result.answer_markdown,
        citations: result.citations,
        playbackHint: result.playbackHint,
        latency_ms: latencyMs
      };

    } catch (error) {
      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      console.error(`[LangGraphRunner] QA failed after ${latencyMs}ms:`, error);

      // Re-throw with context
      if (error instanceof Error) {
        if (error.message.includes('aborted')) {
          throw new Error(`LangGraph request aborted after ${latencyMs}ms`);
        } else if (error.message.includes('timeout')) {
          throw new Error(`LangGraph request timed out after ${latencyMs}ms`);
        } else {
          throw new Error(`LangGraph request failed after ${latencyMs}ms: ${error.message}`);
        }
      }
      
      throw error;

    } finally {
      // Clean up timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Quick test method to verify the runner is working
   */
  async test(datasetPath: string): Promise<boolean> {
    try {
      const testResult = await this.ask({
        datasetPath,
        audiobookId: 'test',
        question: 'What is the main concept?',
        playbackChapterIdx: 1,
        userProgressIdx: 1,
        modeHint: 'auto',
        tokenBudget: 50000
      });

      return testResult.answer_markdown.length > 0;

    } catch (error) {
      console.error('[LangGraphRunner] Test failed:', error);
      return false;
    }
  }

  /**
   * Get default configuration for common use cases
   */
  getDefaultConfig(): Partial<RunnerInput> {
    return {
      modeHint: 'auto',
      tokenBudget: 180000
    };
  }

  /**
   * Validate input before processing
   */
  validateInput(input: RunnerInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.datasetPath) {
      errors.push('datasetPath is required');
    }

    if (!input.audiobookId) {
      errors.push('audiobookId is required');
    }

    if (!input.question || input.question.trim().length === 0) {
      errors.push('question is required and cannot be empty');
    }

    if (!Number.isInteger(input.playbackChapterIdx) || input.playbackChapterIdx < 1) {
      errors.push('playbackChapterIdx must be a positive integer');
    }

    if (!Number.isInteger(input.userProgressIdx) || input.userProgressIdx < 1) {
      errors.push('userProgressIdx must be a positive integer');
    }

    if (input.tokenBudget && (input.tokenBudget < 1000 || input.tokenBudget > 500000)) {
      errors.push('tokenBudget must be between 1000 and 500000');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Factory function for easy instantiation
export function createLangGraphRunner(): LangGraphRunner {
  return new LangGraphRunner(runChapterQA);
}