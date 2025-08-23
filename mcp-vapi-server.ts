#!/usr/bin/env node

/**
 * Nara Vapi MCP Server
 * 
 * Exposes Vapi audio functionality as an MCP (Model Context Protocol) server
 * This allows other systems to route all audio processing through Vapi
 * 
 * Features:
 * - Speech-to-Text (STT) via Vapi
 * - Text-to-Speech (TTS) via ElevenLabs  
 * - Audio pipeline management
 * - Real-time transcription streaming
 * - Wake word detection
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { VapiService } from './main/audio/VapiService.js';
import { TTSService } from './main/audio/TTSService.js';
import { AUDIO_CONFIG } from './main/audio/config.js';

class VapiMCPServer {
  private server: Server;
  private vapiService: VapiService;
  private ttsService: TTSService;
  private isListening = false;
  private currentTranscript = '';

  constructor() {
    this.server = new Server(
      {
        name: 'nara-vapi-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize audio services
    this.vapiService = new VapiService(AUDIO_CONFIG.vapi);
    this.ttsService = new TTSService(AUDIO_CONFIG.elevenlabs);

    this.setupEventHandlers();
    this.setupTools();
  }

  private setupEventHandlers(): void {
    // Handle Vapi transcription events
    this.vapiService.on('transcription', (transcription) => {
      this.currentTranscript = transcription.text;
      
      // Emit transcription event that MCP clients can listen to
      this.server.notification({
        method: 'vapi/transcription',
        params: {
          text: transcription.text,
          isFinal: transcription.isFinal,
          confidence: transcription.confidence,
          timestamp: Date.now()
        }
      });
    });

    // Handle speech detection events
    this.vapiService.on('speechStarted', () => {
      this.server.notification({
        method: 'vapi/speechStarted',
        params: { timestamp: Date.now() }
      });
    });

    this.vapiService.on('speechEnded', () => {
      this.server.notification({
        method: 'vapi/speechEnded', 
        params: { timestamp: Date.now() }
      });
    });

    // Handle wake word detection
    this.vapiService.on('wakeWordDetected', (detection) => {
      this.server.notification({
        method: 'vapi/wakeWordDetected',
        params: {
          phrase: detection.phrase,
          confidence: detection.confidence,
          timestamp: Date.now()
        }
      });
    });

    // Handle errors
    this.vapiService.on('error', (error) => {
      this.server.notification({
        method: 'vapi/error',
        params: {
          error: error.message,
          timestamp: Date.now()
        }
      });
    });
  }

  private setupTools(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'vapi_start_listening',
            description: 'Start listening for speech input via Vapi STT',
            inputSchema: {
              type: 'object',
              properties: {
                mode: {
                  type: 'string',
                  enum: ['wake_word', 'continuous', 'command'],
                  description: 'Listening mode: wake_word (wait for "Hey Nara"), continuous (always listening), command (single command)',
                  default: 'continuous'
                }
              }
            }
          },
          {
            name: 'vapi_stop_listening',
            description: 'Stop listening for speech input',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'vapi_get_transcript',
            description: 'Get the current/latest transcript from Vapi',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'vapi_synthesize_speech',
            description: 'Convert text to speech using ElevenLabs TTS',
            inputSchema: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: 'Text to convert to speech'
                },
                voice_id: {
                  type: 'string',
                  description: 'ElevenLabs voice ID (optional, uses default if not provided)'
                },
                model: {
                  type: 'string',
                  enum: ['eleven_monolingual_v1', 'eleven_turbo_v2'],
                  description: 'TTS model to use',
                  default: 'eleven_turbo_v2'
                }
              },
              required: ['text']
            }
          },
          {
            name: 'vapi_get_status',
            description: 'Get current status of the Vapi audio pipeline',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'vapi_configure_assistant',
            description: 'Update Vapi assistant configuration',
            inputSchema: {
              type: 'object',
              properties: {
                assistant_id: {
                  type: 'string',
                  description: 'Vapi assistant ID to use'
                },
                wake_word_enabled: {
                  type: 'boolean',
                  description: 'Enable wake word detection'
                },
                wake_word_phrase: {
                  type: 'string',
                  description: 'Wake word phrase (e.g., "Hey Nara")'
                }
              }
            }
          }
        ] as Tool[]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'vapi_start_listening':
            return await this.handleStartListening(args);
          
          case 'vapi_stop_listening':
            return await this.handleStopListening();
          
          case 'vapi_get_transcript':
            return await this.handleGetTranscript();
          
          case 'vapi_synthesize_speech':
            return await this.handleSynthesizeSpeech(args);
          
          case 'vapi_get_status':
            return await this.handleGetStatus();
          
          case 'vapi_configure_assistant':
            return await this.handleConfigureAssistant(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    });
  }

  private async handleStartListening(args: any) {
    const mode = args.mode || 'continuous';
    
    if (this.isListening) {
      return {
        content: [
          {
            type: 'text',
            text: 'Already listening. Stop first before starting again.'
          }
        ]
      };
    }

    try {
      switch (mode) {
        case 'wake_word':
          await this.vapiService.startWakeWordListening();
          break;
        case 'continuous':
          await this.vapiService.startListening();
          break;
        case 'command':
          await this.vapiService.startCommandListening();
          break;
        default:
          throw new Error(`Invalid mode: ${mode}`);
      }

      this.isListening = true;
      
      return {
        content: [
          {
            type: 'text',
            text: `Started listening in ${mode} mode. Vapi is now capturing audio input.`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to start listening: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleStopListening() {
    if (!this.isListening) {
      return {
        content: [
          {
            type: 'text',
            text: 'Not currently listening.'
          }
        ]
      };
    }

    try {
      await this.vapiService.stopListening();
      this.isListening = false;
      
      return {
        content: [
          {
            type: 'text',
            text: 'Stopped listening. Vapi audio input has been disabled.'
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to stop listening: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGetTranscript() {
    return {
      content: [
        {
          type: 'text',
          text: this.currentTranscript || 'No transcript available'
        }
      ]
    };
  }

  private async handleSynthesizeSpeech(args: any) {
    const { text, voice_id, model } = args;
    
    if (!text) {
      throw new Error('Text is required for speech synthesis');
    }

    try {
      const response = await this.ttsService.synthesizeText(text, {
        voiceId: voice_id,
        model: model || 'eleven_turbo_v2'
      });

      return {
        content: [
          {
            type: 'text',
            text: `Successfully synthesized speech for: "${text}". Audio stream ready for playback.`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to synthesize speech: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGetStatus() {
    const status = {
      isListening: this.isListening,
      currentTranscript: this.currentTranscript,
      vapiConnected: this.vapiService.isConnected,
      assistantId: AUDIO_CONFIG.vapi.assistantId,
      wakeWordEnabled: AUDIO_CONFIG.vapi.wakeWord?.enabled || false,
      wakeWordPhrase: AUDIO_CONFIG.vapi.wakeWord?.phrase || 'Not configured'
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(status, null, 2)
        }
      ]
    };
  }

  private async handleConfigureAssistant(args: any) {
    const { assistant_id, wake_word_enabled, wake_word_phrase } = args;
    
    // Update configuration (this would typically persist to config file)
    if (assistant_id) {
      AUDIO_CONFIG.vapi.assistantId = assistant_id;
    }
    
    if (wake_word_enabled !== undefined) {
      if (!AUDIO_CONFIG.vapi.wakeWord) {
        AUDIO_CONFIG.vapi.wakeWord = { enabled: false, phrase: 'Hey Nara', sensitivity: 0.7 };
      }
      AUDIO_CONFIG.vapi.wakeWord.enabled = wake_word_enabled;
    }
    
    if (wake_word_phrase) {
      if (!AUDIO_CONFIG.vapi.wakeWord) {
        AUDIO_CONFIG.vapi.wakeWord = { enabled: true, phrase: wake_word_phrase, sensitivity: 0.7 };
      } else {
        AUDIO_CONFIG.vapi.wakeWord.phrase = wake_word_phrase;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `Assistant configuration updated. Restart listening to apply changes.`
        }
      ]
    };
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Nara Vapi MCP Server running on stdio');
  }
}

// Start the server
const server = new VapiMCPServer();
server.start().catch((error) => {
  console.error('Failed to start Vapi MCP server:', error);
  process.exit(1);
});
