/**
 * LangGraph Runner - Adapter for runChapterQA with AbortSignal support
 * Provides a clean interface for the Voice Agent Bridge
 */

import { runChapterQA } from '../graph';
import { GraphInput } from '../types';

export interface RunnerInput {
  transcriptData: any; // CanonicalTranscript data object
  audiobookId: string;
  question: string;
  playbackChapterIdx: number;
  userProgressIdx: number;
  modeHint?: "auto" | "full" | "compressed" | "focused";
  tokenBudget?: number;
  signal?: AbortSignal;
  datasetPath?: string; // Optional for backwards compatibility with summaries
}

export interface RunnerOutput {
  answer_markdown: string;
  citations: Array<{ type: 'para' | 'time'; ref: string }>;
  playbackHint?: { chapter_idx: number; start_s: number };
  latency_ms: number;
}

export class LangGraphRunner {
  private runChapterQA: typeof runChapterQA;

  constructor(runChapterQAFn?: typeof runChapterQA) {
    this.runChapterQA = runChapterQAFn || runChapterQA;
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
      transcriptData: input.transcriptData,
      audiobookId: input.audiobookId,
      question: input.question,
      playbackChapterIdx: input.playbackChapterIdx,
      userProgressIdx: input.userProgressIdx,
      modeHint: input.modeHint ?? "auto",
      tokenBudget: input.tokenBudget ?? 180000,
      includePriorSummaries: true,
      datasetPath: input.datasetPath // Optional for summaries
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
  async test(transcriptData: any): Promise<boolean> {
    try {
      const testResult = await this.ask({
        transcriptData,
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

    if (!input.transcriptData) {
      errors.push('transcriptData is required');
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
  
  /**
   * Generate actionable notes from conversation transcript using LangGraph
   */
  async generateNote(input: {
    transcript: string;
    context?: {
      transcriptData?: any;
      audiobookId?: string;
      chapterIdx?: number;
    };
  }): Promise<string> {
    try {
      // Build the note generation prompt
      const notePrompt = `Analyze the transcript below. Identify what the reader/user needs. Then extract a minimum of 1 and maximum of 3 bullet points that really highlight the actionable takeaways from this conversation. Remember keep this as minimum as possible but use up to 3 bullet points if you feel there is a lot of high level information to extract\n\n${input.transcript}\n\nRespond with a title that summarizes the conversation actionable bullet points. Nothing more`;
      
      // Use existing QA system with compressed mode for note generation
      const result = await this.ask({
        transcriptData: input.context?.transcriptData || {},
        audiobookId: input.context?.audiobookId || 'note-gen',
        question: notePrompt,
        playbackChapterIdx: input.context?.chapterIdx || 1,
        userProgressIdx: input.context?.chapterIdx || 1,
        modeHint: 'compressed', // Use compressed for concise notes
        tokenBudget: 10000 // Smaller budget for note generation
      });
      
      // Extract and format the note from response
      return this.formatAsNote(result.answer_markdown);
      
    } catch (error) {
      console.error('[LangGraphRunner] Note generation failed:', error);
      // Return simple fallback
      return `Voice Discussion\n• ${input.transcript.substring(0, 100)}...`;
    }
  }
  
  /**
   * Format LangGraph output as actionable note
   */
  private formatAsNote(markdown: string): string {
    const lines = markdown.split('\n').filter(l => l.trim());
    
    // Extract title
    let title = lines.find(l => !l.startsWith('•') && !l.startsWith('-') && !l.startsWith('*'));
    if (title) {
      title = title.replace(/^#+\s*/, '').trim();
    } else {
      title = 'Discussion Notes';
    }
    
    // Extract bullets (max 3)
    const bullets = lines
      .filter(l => l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || /^\d+\./.test(l))
      .map(l => l.replace(/^[•\-*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
      .slice(0, 3);
    
    // Format
    let formatted = title + '\n\n';
    bullets.forEach(b => formatted += `• ${b}\n`);
    
    return formatted.trim();
  }
  
  /**
   * Extension method for note generation (for API compatibility)
   */
  async runWithNoteGeneration(input: {
    prompt: string;
    context?: any;
    mode?: string;
  }): Promise<string> {
    return this.generateNote({
      transcript: input.prompt,
      context: input.context
    });
  }
}

// Factory function for easy instantiation
export function createLangGraphRunner(): LangGraphRunner {
  return new LangGraphRunner(runChapterQA);
}