# Nara Vapi MCP Server

This MCP (Model Context Protocol) server exposes Nara's Vapi audio functionality, allowing other systems to route all audio processing through Vapi.

## Features

- **Speech-to-Text (STT)** via Vapi with real-time transcription
- **Text-to-Speech (TTS)** via ElevenLabs
- **Wake word detection** ("Hey Nara")
- **Audio pipeline management** with status monitoring
- **Real-time notifications** for transcription events

## Quick Start

### 1. Install Dependencies

```bash
npm install @modelcontextprotocol/sdk tsx typescript
```

### 2. Start the MCP Server

```bash
npm run mcp:server
```

### 3. Use the MCP Client

```bash
npm run mcp:client
```

## MCP Tools Available

### `vapi_start_listening`
Start listening for speech input via Vapi STT.

**Parameters:**
- `mode` (optional): `"wake_word"`, `"continuous"`, or `"command"` (default: `"continuous"`)

**Example:**
```json
{
  "name": "vapi_start_listening",
  "arguments": {
    "mode": "continuous"
  }
}
```

### `vapi_stop_listening`
Stop listening for speech input.

**Example:**
```json
{
  "name": "vapi_stop_listening",
  "arguments": {}
}
```

### `vapi_get_transcript`
Get the current/latest transcript from Vapi.

**Example:**
```json
{
  "name": "vapi_get_transcript",
  "arguments": {}
}
```

### `vapi_synthesize_speech`
Convert text to speech using ElevenLabs TTS.

**Parameters:**
- `text` (required): Text to convert to speech
- `voice_id` (optional): ElevenLabs voice ID
- `model` (optional): `"eleven_monolingual_v1"` or `"eleven_turbo_v2"` (default: `"eleven_turbo_v2"`)

**Example:**
```json
{
  "name": "vapi_synthesize_speech",
  "arguments": {
    "text": "Hello, this is a test of the speech synthesis system.",
    "voice_id": "XfWTl5ev8ylYnkKBEqnB",
    "model": "eleven_turbo_v2"
  }
}
```

### `vapi_get_status`
Get current status of the Vapi audio pipeline.

**Example:**
```json
{
  "name": "vapi_get_status",
  "arguments": {}
}
```

**Response:**
```json
{
  "isListening": true,
  "currentTranscript": "Hello world",
  "vapiConnected": true,
  "assistantId": "0bfc6364-690a-492b-9671-a109c5937342",
  "wakeWordEnabled": true,
  "wakeWordPhrase": "Hey Nara"
}
```

### `vapi_configure_assistant`
Update Vapi assistant configuration.

**Parameters:**
- `assistant_id` (optional): Vapi assistant ID to use
- `wake_word_enabled` (optional): Enable wake word detection
- `wake_word_phrase` (optional): Wake word phrase (e.g., "Hey Nara")

**Example:**
```json
{
  "name": "vapi_configure_assistant",
  "arguments": {
    "assistant_id": "0bfc6364-690a-492b-9671-a109c5937342",
    "wake_word_enabled": true,
    "wake_word_phrase": "Hey Nara"
  }
}
```

## Real-time Notifications

The MCP server sends real-time notifications for audio events:

### `vapi/transcription`
Sent when speech is transcribed.

**Parameters:**
- `text`: The transcribed text
- `isFinal`: Whether this is a final or partial transcript
- `confidence`: Confidence score (0-1)
- `timestamp`: Unix timestamp

### `vapi/speechStarted`
Sent when speech detection begins.

### `vapi/speechEnded`
Sent when speech detection ends.

### `vapi/wakeWordDetected`
Sent when the wake word is detected.

**Parameters:**
- `phrase`: The detected wake word phrase
- `confidence`: Detection confidence (0-1)
- `timestamp`: Unix timestamp

### `vapi/error`
Sent when an error occurs.

**Parameters:**
- `error`: Error message
- `timestamp`: Unix timestamp

## Integration Example

```typescript
import { VapiMCPClient } from './mcp-vapi-client-example';

const client = new VapiMCPClient();

// Connect to MCP server
await client.connect();

// Start listening
await client.startListening('continuous');

// The client will receive real-time transcription notifications
// and can process them through your AI system

// Synthesize response
await client.synthesizeSpeech("This is the AI response");
```

## Configuration

The MCP server uses the configuration from `main/audio/config.ts`:

```typescript
export const AUDIO_CONFIG = {
  vapi: {
    apiKey: 'your-vapi-api-key',
    assistantId: 'your-assistant-id',
    // ... other config
  },
  elevenlabs: {
    apiKey: 'your-elevenlabs-api-key',
    voiceId: 'your-voice-id',
    // ... other config
  }
};
```

## Use Cases

### 1. AI Assistant Integration
Route all voice interactions through Vapi for consistent STT/TTS processing.

### 2. Audiobook Copilot
Process user questions about audiobooks and provide AI-generated responses.

### 3. Voice-Controlled Applications
Add voice control to any application by connecting to the MCP server.

### 4. Multi-Modal AI Systems
Combine voice input/output with other AI capabilities through the MCP protocol.

## Architecture

```
┌─────────────────┐    MCP Protocol    ┌──────────────────┐
│   AI System     │◄──────────────────►│  Vapi MCP Server │
│   (Your Code)   │                    │                  │
└─────────────────┘                    └──────────────────┘
                                              │
                                              ▼
                                       ┌──────────────────┐
                                       │  Vapi Service    │
                                       │  TTS Service     │
                                       │  Audio Pipeline  │
                                       └──────────────────┘
                                              │
                                              ▼
                                       ┌──────────────────┐
                                       │   Vapi API       │
                                       │   ElevenLabs API │
                                       └──────────────────┘
```

## Troubleshooting

### Server Won't Start
- Check that all dependencies are installed: `npm install`
- Verify API keys are configured in `main/audio/config.ts`
- Ensure ports are not in use

### No Audio Input
- Check microphone permissions
- Verify Vapi assistant is configured correctly
- Check browser/system audio settings

### TTS Not Working
- Verify ElevenLabs API key and voice ID
- Check network connectivity
- Ensure voice ID exists in your ElevenLabs account

## Development

### Build the Server
```bash
npm run mcp:build
```

### Run in Development Mode
```bash
npm run mcp:server
```

### Test with Example Client
```bash
npm run mcp:client
```
