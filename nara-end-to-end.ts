#!/usr/bin/env node

/**
 * Nara Audiobook Copilot - End-to-End Vapi Workflow
 *
 * This uses your fully configured Vapi assistant for complete
 * speech-to-speech audiobook conversations.
 */

import { VapiService } from './main/audio/VapiService';
import { AUDIO_CONFIG } from './main/audio/config';

class NaraAudiobookCopilot {
  private vapi: VapiService;

  constructor() {
    console.log('🎧 Initializing Nara Audiobook Copilot...');

    // Use your end-to-end assistant
    this.vapi = new VapiService(AUDIO_CONFIG.vapi);

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Listen for conversation events
    this.vapi.on('conversationStarted', () => {
      console.log('🎙️  Conversation started with Nara');
    });

    this.vapi.on('transcription', (data) => {
      if (data.isFinal) {
        console.log(`👤 You: "${data.text}"`);
      }
    });

    this.vapi.on('response', (data) => {
      console.log(`🤖 Nara: "${data.text}"`);
    });

    this.vapi.on('conversationEnded', () => {
      console.log('👋 Conversation ended');
    });

    this.vapi.on('error', (error) => {
      console.error('❌ Error:', error);
    });
  }

  async start() {
    console.log('');
    console.log('🚀 Starting Nara Audiobook Copilot...');
    console.log('');
    console.log('💡 Your assistant handles:');
    console.log('   • 🎤 Speech-to-Text (Azure STT)');
    console.log('   • 🧠 AI Processing (GPT-4o)');
    console.log('   • 🗣️  Text-to-Speech (Vapi TTS - Elliot voice)');
    console.log('   • 💬 Natural conversation flow');
    console.log('');

    try {
      // Start the full conversation
      await this.vapi.startListening();

      console.log('✅ Nara is ready and listening!');
      console.log('');
      console.log('🎯 Try these audiobook questions:');
      console.log('   "What happened in the last chapter?"');
      console.log('   "Who is the main character?"');
      console.log('   "What are the main themes so far?"');
      console.log('   "Can you summarize this chapter?"');
      console.log('   "What do you think about the author\'s writing style?"');
      console.log('');
      console.log('🗣️  Just start talking - Nara will respond naturally!');
      console.log('⏹️  Press Ctrl+C to stop');

    } catch (error) {
      console.error('❌ Failed to start copilot:', error);
    }
  }

  async stop() {
    console.log('\n🛑 Stopping Nara...');
    await this.vapi.stopListening();
    console.log('✅ Nara stopped listening');
  }
}

// Create and start the copilot
const copilot = new NaraAudiobookCopilot();

// Start the copilot
copilot.start().catch((error) => {
  console.error('❌ Failed to start Nara:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await copilot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await copilot.stop();
  process.exit(0);
});
