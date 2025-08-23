/**
 * LLM Interface - Clean contract for the LLM team
 * THEIR DOMAIN: Claude integration + spoiler prevention
 */

export interface LLMRequest {
  userQuestion: string;
  bookContext: {
    title: string;
    author: string;
    currentChapter: number;
    currentTimestamp: number; // seconds into audiobook
    userProgress: number; // percentage through book
  };
  conversationHistory?: LLMMessage[];
}

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface LLMResponse {
  answer: string;
  confidence: number; // 0-1, how confident the answer is
  spoilerRisk: 'none' | 'low' | 'medium' | 'high';
  sources?: string[]; // References to book sections used
  followUpSuggestions?: string[];
}

export interface LLMConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  spoilerGuardEnabled: boolean;
  contextWindow: number; // chapters to include in context
}

/**
 * PLACEHOLDER IMPLEMENTATION
 * LLM team will replace this with real Claude integration
 */
export class LLMService {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log('[LLMService] PLACEHOLDER - LLM team will implement');
    // LLM team: Initialize Claude, load spoiler prevention prompts
  }

  async processQuestion(request: LLMRequest): Promise<LLMResponse> {
    console.log(`[LLMService] PLACEHOLDER - Processing: "${request.userQuestion}"`);

    // PLACEHOLDER: Return mock response for audio team testing
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing time

    return {
      answer: `This is a placeholder response for: "${request.userQuestion}". The LLM team will implement the real Claude integration with spoiler prevention.`,
      confidence: 0.8,
      spoilerRisk: 'none',
      sources: ['Chapter 1', 'Chapter 2'],
      followUpSuggestions: [
        'Tell me more about this character',
        'What happened earlier in this chapter?'
      ]
    };
  }

  async updateBookContext(bookId: string, progress: number): Promise<void> {
    console.log(`[LLMService] PLACEHOLDER - Updating context for book ${bookId}, progress ${progress}%`);
    // LLM team: Update spoiler prevention based on current progress
  }

  getConfig(): LLMConfig {
    return { ...this.config };
  }
}

// Export the interface for the audio team to use
export const createLLMService = (config: LLMConfig): LLMService => {
  return new LLMService(config);
};
