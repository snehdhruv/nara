#!/usr/bin/env node

/**
 * Example MCP Client for Nara Vapi Server
 *
 * This demonstrates how to connect to and use the Vapi MCP server
 * to route all audio processing through Vapi
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

class VapiMCPClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;

  constructor() {
    this.client = new Client(
      {
        name: 'nara-vapi-client',
        version: '1.0.0',
      },
      {
        capabilities: {}
      }
    );
  }

  async connect(): Promise<void> {
    // Spawn the MCP server process
    const serverProcess = spawn('node', ['./mcp-vapi-server.js'], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    // Create transport using the server's stdio
    this.transport = new StdioClientTransport({
      readable: serverProcess.stdout!,
      writable: serverProcess.stdin!
    });

    // Connect to the server
    await this.client.connect(this.transport);
    console.log('Connected to Nara Vapi MCP Server');

    // Set up notification handlers
    this.setupNotificationHandlers();
  }

  private setupNotificationHandlers(): void {
    // Handle real-time transcription
    this.client.setNotificationHandler('vapi/transcription', (params) => {
      console.log(`📝 Transcription: "${params.text}" (${params.isFinal ? 'final' : 'partial'})`);

      // You can route this to your AI system here
      if (params.isFinal) {
        this.handleFinalTranscript(params.text);
      }
    });

    // Handle speech detection
    this.client.setNotificationHandler('vapi/speechStarted', () => {
      console.log('🎤 Speech started');
    });

    this.client.setNotificationHandler('vapi/speechEnded', () => {
      console.log('🤐 Speech ended');
    });

    // Handle wake word detection
    this.client.setNotificationHandler('vapi/wakeWordDetected', (params) => {
      console.log(`🎯 Wake word detected: "${params.phrase}" (${Math.round(params.confidence * 100)}%)`);
    });

    // Handle errors
    this.client.setNotificationHandler('vapi/error', (params) => {
      console.error(`❌ Vapi error: ${params.error}`);
    });
  }

  private async handleFinalTranscript(text: string): Promise<void> {
    console.log(`🧠 Processing final transcript: "${text}"`);

    // Example: Route to your AI system (replace with your actual AI integration)
    const aiResponse = await this.getAIResponse(text);

    // Synthesize AI response using Vapi's TTS
    await this.synthesizeSpeech(aiResponse);
  }

  private async getAIResponse(userInput: string): Promise<string> {
    // Mock AI response - replace with your actual AI system
    const mockResponses = [
      "That's an interesting point about the story.",
      "The character development in this chapter is quite compelling.",
      "This part of the book explores important themes.",
      "The author's writing style really shines here."
    ];

    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
  }

  // MCP Tool Methods
  async startListening(mode: 'wake_word' | 'continuous' | 'command' = 'continuous'): Promise<void> {
    const result = await this.client.request(
      {
        method: 'tools/call',
        params: {
          name: 'vapi_start_listening',
          arguments: { mode }
        }
      },
      { timeout: 10000 }
    );

    console.log('✅', result.content[0].text);
  }

  async stopListening(): Promise<void> {
    const result = await this.client.request(
      {
        method: 'tools/call',
        params: {
          name: 'vapi_stop_listening',
          arguments: {}
        }
      },
      { timeout: 5000 }
    );

    console.log('⏹️', result.content[0].text);
  }

  async getTranscript(): Promise<string> {
    const result = await this.client.request(
      {
        method: 'tools/call',
        params: {
          name: 'vapi_get_transcript',
          arguments: {}
        }
      },
      { timeout: 5000 }
    );

    return result.content[0].text;
  }

  async synthesizeSpeech(text: string, voiceId?: string): Promise<void> {
    const result = await this.client.request(
      {
        method: 'tools/call',
        params: {
          name: 'vapi_synthesize_speech',
          arguments: { text, voice_id: voiceId }
        }
      },
      { timeout: 15000 }
    );

    console.log('🗣️', result.content[0].text);
  }

  async getStatus(): Promise<any> {
    const result = await this.client.request(
      {
        method: 'tools/call',
        params: {
          name: 'vapi_get_status',
          arguments: {}
        }
      },
      { timeout: 5000 }
    );

    return JSON.parse(result.content[0].text);
  }

  async configureAssistant(config: {
    assistant_id?: string;
    wake_word_enabled?: boolean;
    wake_word_phrase?: string;
  }): Promise<void> {
    const result = await this.client.request(
      {
        method: 'tools/call',
        params: {
          name: 'vapi_configure_assistant',
          arguments: config
        }
      },
      { timeout: 5000 }
    );

    console.log('⚙️', result.content[0].text);
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.client.close();
      this.transport = null;
    }
  }
}

// Example usage
async function main() {
  const client = new VapiMCPClient();

  try {
    // Connect to MCP server
    await client.connect();

    // Get initial status
    const status = await client.getStatus();
    console.log('📊 Initial status:', status);

    // Start listening for speech
    await client.startListening('continuous');

    // The client will now receive real-time transcription notifications
    // and automatically process them through your AI system

    console.log('🎧 Listening for speech... Press Ctrl+C to stop');

    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      await client.stopListening();
      await client.disconnect();
      process.exit(0);
    });

    // Example: Test TTS after 5 seconds
    setTimeout(async () => {
      await client.synthesizeSpeech("Hello! This is a test of the Nara Vapi MCP server.");
    }, 5000);

  } catch (error) {
    console.error('❌ Error:', error);
    await client.disconnect();
    process.exit(1);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main();
}

export { VapiMCPClient };
