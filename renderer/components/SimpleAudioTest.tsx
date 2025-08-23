/**
 * SimpleAudioTest - Direct browser-based audio testing (like our working HTML tests)
 * No IPC, no main process - just pure browser WebSocket + ElevenLabs
 */

import { useState, useRef } from 'react'

// Configuration (from main/audio/config.ts)
const CONFIG = {
  vapi: {
    apiKey: '765f8644-1464-4b36-a4fe-c660e15ba313',
    assistantId: '0bfc6364-690a-492b-9671-a109c5937342' // Nara STT-Only
  },
  elevenlabs: {
    apiKey: 'sk_536c3f9ad29e9e6e4f0b4aee762afa6d8db7d750d7f64587', // Real API key from config.ts
    voiceId: 'XfWTl5ev8ylYnkKBEqnB' // Real voice ID from config.ts
  }
}

interface VapiMessage {
  type: string
  role?: string
  transcript?: string
  transcriptType?: string
  [key: string]: any
}

export default function SimpleAudioTest() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [status, setStatus] = useState('Ready to test')
  const [log, setLog] = useState<string[]>([])

  const websocketRef = useRef<WebSocket | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)])
  }

  const startListening = async () => {
    try {
      setIsListening(true)
      setStatus('Starting...')
      addLog('🎤 Starting speech recognition...')

      // 1. Get microphone access
      addLog('1. Requesting microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })
      mediaStreamRef.current = stream
      addLog('✅ Microphone access granted')

      // 2. Create Vapi call
      addLog('2. Creating Vapi call...')
      const response = await fetch('https://api.vapi.ai/call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.vapi.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assistantId: CONFIG.vapi.assistantId,
          transport: {
            provider: 'vapi.websocket',
            audioFormat: {
              format: 'pcm_s16le',
              container: 'raw',
              sampleRate: 16000
            }
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create call: ${response.status}`)
      }

      const callData = await response.json()
      addLog(`✅ Call created: ${callData.id}`)

      // 3. Connect to WebSocket
      addLog('3. Connecting to Vapi WebSocket...')
      const ws = new WebSocket(callData.transport.websocketCallUrl)
      websocketRef.current = ws

      ws.onopen = () => {
        addLog('✅ WebSocket connected')
        setStatus('Listening... Say something!')
        startAudioStreaming(stream, ws)
      }

      ws.onmessage = (event) => {
        handleVapiMessage(event.data)
      }

      ws.onerror = (error) => {
        addLog(`❌ WebSocket error: ${error}`)
        setStatus('WebSocket error')
      }

      ws.onclose = () => {
        addLog('🔌 WebSocket disconnected')
        setStatus('Disconnected')
        setIsListening(false)
      }

    } catch (error) {
      addLog(`❌ Error: ${error}`)
      setStatus('Error')
      setIsListening(false)
    }
  }

  const startAudioStreaming = (stream: MediaStream, ws: WebSocket) => {
    // Create audio context with 16kHz sample rate
    const audioContext = new AudioContext({ sampleRate: 16000 })
    audioContextRef.current = audioContext

    const source = audioContext.createMediaStreamSource(stream)
    const processor = audioContext.createScriptProcessor(4096, 1, 1)

    processor.onaudioprocess = (event) => {
      if (ws.readyState === WebSocket.OPEN) {
        const inputBuffer = event.inputBuffer.getChannelData(0)

        // Convert Float32Array to Int16Array (PCM)
        const pcmBuffer = new Int16Array(inputBuffer.length)
        for (let i = 0; i < inputBuffer.length; i++) {
          pcmBuffer[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32768))
        }

        try {
          ws.send(pcmBuffer.buffer)
        } catch (error) {
          console.warn('Failed to send audio data:', error)
        }
      }
    }

    source.connect(processor)
    processor.connect(audioContext.destination)
  }

  const handleVapiMessage = (data: any) => {
    // Handle binary audio data
    if (data instanceof Blob || data instanceof ArrayBuffer) {
      return // Ignore binary audio data for STT-only mode
    }

    try {
      const message: VapiMessage = JSON.parse(data)

      // Log all messages (truncated)
      const logData = JSON.stringify(message).substring(0, 100)
      addLog(`📥 ${message.type}: ${logData}${logData.length >= 100 ? '...' : ''}`)

      // Handle transcript messages
      if (message.type === 'transcript' && message.role === 'user') {
        const text = message.transcript || message.text || ''
        if (text && text !== 'undefined') {
          setTranscript(text)
          addLog(`📝 USER: "${text}" (${message.transcriptType || 'unknown'})`)

          // If it's a final transcript, trigger TTS
          if (message.transcriptType === 'final') {
            handleFinalTranscript(text)
          }
        }
      }

      // Handle status updates
      if (message.type === 'status-update') {
        setStatus(`Status: ${message.status}`)
      }

    } catch (error) {
      // Not JSON, probably binary data
      console.log('Non-JSON message received (likely binary audio)')
    }
  }

  const handleFinalTranscript = async (text: string) => {
    addLog(`🎯 Final transcript: "${text}"`)

    // Mock AI response (your team will replace this with LangGraph)
    const mockResponses = [
      "This part of the book explores themes of identity and growth.",
      "The author's writing style really shines in this section.",
      "That's an interesting question about the story.",
      "The main character is quite complex in this chapter."
    ]
    const aiResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)]

    addLog(`🧠 Mock AI Response: "${aiResponse}"`)

    // Synthesize with ElevenLabs
    await synthesizeText(aiResponse)
  }

  const synthesizeText = async (text: string) => {
    try {
      addLog(`🗣️ Synthesizing: "${text}"`)

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${CONFIG.elevenlabs.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': CONFIG.elevenlabs.apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      })

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`)
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
        addLog('✅ TTS playback complete')
      }

      await audio.play()
      addLog('🔊 Playing TTS audio...')

    } catch (error) {
      addLog(`❌ TTS failed: ${error}`)
    }
  }

  const stopListening = () => {
    if (websocketRef.current) {
      websocketRef.current.close()
      websocketRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    setIsListening(false)
    setStatus('Stopped')
    addLog('⏹️ Stopped listening')
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🎯 Nara Audio Test (Electron)
        </h1>
        <p className="text-gray-600">
          Direct browser-based STT → AI → TTS pipeline
        </p>
      </div>

      {/* Status Card */}
      <div className={`p-4 rounded-lg border-2 ${
        isListening ? 'text-green-600 bg-green-50 border-green-200' :
        'text-blue-600 bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{isListening ? '🎤' : '⏸️'}</span>
          <div>
            <h3 className="font-semibold">{isListening ? 'Listening' : 'Ready'}</h3>
            <p className="text-sm">{status}</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="text-center space-x-4">
        <button
          onClick={startListening}
          disabled={isListening}
          className={`px-6 py-3 rounded-lg font-semibold ${
            isListening
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          🎤 Start Voice Pipeline
        </button>

        <button
          onClick={stopListening}
          disabled={!isListening}
          className={`px-6 py-3 rounded-lg font-semibold ${
            !isListening
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          ⏹️ Stop
        </button>
      </div>

      {/* Current Transcript */}
      {transcript && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-semibold text-yellow-800 mb-2">📝 Current Transcript:</h4>
          <p className="text-yellow-700">"{transcript}"</p>
        </div>
      )}

      {/* Configuration Display */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="p-3 bg-gray-50 rounded">
          <h4 className="font-semibold mb-2">🎯 Vapi Configuration</h4>
          <p><strong>Assistant:</strong> Nara STT-Only</p>
          <p><strong>Transcriber:</strong> GPT-4o Transcribe (OpenAI)</p>
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <h4 className="font-semibold mb-2">🗣️ ElevenLabs Configuration</h4>
          <p><strong>Voice:</strong> Paul Spotify</p>
          <p><strong>Model:</strong> eleven_monolingual_v1</p>
        </div>
      </div>

      {/* Debug Log */}
      <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm">
        <h4 className="text-white font-semibold mb-2">🐛 Debug Log</h4>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {log.length === 0 ? (
            <p className="text-gray-500">Click "Start Voice Pipeline" to begin testing...</p>
          ) : (
            log.map((entry, index) => (
              <div key={index}>{entry}</div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">📋 How to Test:</h4>
        <ol className="text-blue-700 space-y-1 text-sm">
          <li>1. Click "Start Voice Pipeline"</li>
          <li>2. Allow microphone access when prompted</li>
          <li>3. Wait for "Listening... Say something!" status</li>
          <li>4. Speak clearly: "Hello, this is a test"</li>
          <li>5. Watch the transcript appear and AI respond with TTS</li>
        </ol>
      </div>
    </div>
  )
}
