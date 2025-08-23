import type { AnthropicMessage } from './types';

export interface LLMClient {
  complete(params: {
    system: string;
    messages: AnthropicMessage[];
  }): Promise<string>;
}

class DedalusClient implements LLMClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.dedaluslabs.ai';
  
  constructor() {
    // Use the Dedalus API key you provided
    const apiKey = process.env.DEDALUS_API_KEY || 'dsk_live_6a4ebff6cb9b_5da8bb2a9fd5454f47afbf262e4ae9d3';
    if (!apiKey) {
      throw new Error('DEDALUS_API_KEY is required');
    }
    this.apiKey = apiKey;
  }
  
  async complete(params: {
    system: string;
    messages: AnthropicMessage[];
  }): Promise<string> {
    try {
      // Format messages for Dedalus API
      const formattedMessages = [
        { role: 'system', content: params.system },
        ...params.messages
      ];
      
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-opus-20240229', // Claude Opus via Dedalus
          messages: formattedMessages,
          max_tokens: 4096,
          temperature: 0.7
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Dedalus API error: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      
      // Extract content from response
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      
      throw new Error('Unexpected response format from Dedalus');
    } catch (error) {
      console.error('Dedalus LLM call failed:', error);
      throw error;
    }
  }
}

let clientInstance: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (!clientInstance) {
    clientInstance = new DedalusClient();
  }
  return clientInstance;
}