import React, { useState, useRef } from 'react';

const SimpleVapiTest = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('Ready to test...');
  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Configuration - same as browser test
  const CONFIG = {
    vapi: {
      apiKey: '765f8644-1464-4b36-a4fe-c660e15ba313',
      assistantId: '0bfc6364-690a-492b-9671-a109c5937342'
    },
    elevenlabs: {
      apiKey: 'sk_536c3f9ad29e9e6e4f0b4aee762afa6d8db7d750d7f64587',
      voiceId: 'XfWTl5ev8ylYnkKBEqnB'
    }
  };

  const log = (message: string) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
    setStatus(message);
  };

  const startListening = async () => {
    try {
      setIsListening(true);
      log('🎤 Starting speech recognition...');

      // 1. Get microphone access
      log('1. Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      log('✅ Microphone access granted');

      // 2. Create Vapi call
      log('2. Creating Vapi call...');
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
      });

      if (!response.ok) {
        throw new Error(`Failed to create call: ${response.status}`);
      }

      const callData = await response.json();
      log(`✅ Call created: ${callData.id}`);

      // 3. Connect to WebSocket
      log('3. Connecting to Vapi WebSocket...');
      websocketRef.current = new WebSocket(callData.transport.websocketCallUrl);

      websocketRef.current.onopen = () => {
        log('✅ WebSocket connected');
        startAudioStreaming(stream);
      };

      websocketRef.current.onmessage = (event) => {
        handleMessage(event);
      };

      websocketRef.current.onerror = (error) => {
        log(`❌ WebSocket error: ${error}`);
      };

      websocketRef.current.onclose = () => {
        log('🔌 WebSocket disconnected');
      };

    } catch (error) {
      log(`❌ Failed to start: ${error.message}`);
      setIsListening(false);
    }
  };

  const handleMessage = (event: MessageEvent) => {
    try {
      // Check if this is binary audio data
      if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
        return; // Ignore audio data for STT-only mode
      }

      if (typeof event.data !== 'string') {
        return;
      }

      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'transcript':
          if (message.role === 'user') {
            const text = message.transcript || '';
            const type = message.transcriptType || 'unknown';
            log(`📝 USER: "${text}" (${type})`);
            setTranscript(text);

            // If final transcript, test TTS
            if (type === 'final' && text.trim()) {
              setTimeout(() => testTTS(text), 1000);
            }
          }
          break;

        case 'speech-update':
          if (message.role === 'user') {
            log(`🗣️ Speech ${message.status}`);
          }
          break;

        case 'status-update':
          log(`📊 Status: ${message.status}`);
          break;
      }
    } catch (error) {
      log(`❌ Failed to parse message: ${error}`);
    }
  };

  const startAudioStreaming = (stream: MediaStream) => {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    log(`📊 Audio context sample rate: ${audioContext.sampleRate}Hz`);

    processor.onaudioprocess = (event) => {
      if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
        const inputData = event.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);

        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }

        try {
          websocketRef.current.send(pcmData.buffer);
        } catch (error) {
          log(`❌ Failed to send audio: ${error}`);
        }
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  };

  const testTTS = async (text: string) => {
    try {
      log(`🗣️ Testing TTS: "${text}"`);

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${CONFIG.elevenlabs.voiceId}/stream`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': CONFIG.elevenlabs.apiKey
        },
        body: JSON.stringify({
          text: `You said: ${text}`,
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audio = new Audio();
      const url = URL.createObjectURL(audioBlob);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        log('✅ TTS playback complete');
      };

      audio.src = url;
      audio.play();
      log('🔊 Playing TTS response');

    } catch (error) {
      log(`❌ TTS failed: ${error.message}`);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    log('⏹️ Stopping...');

    if (websocketRef.current) {
      websocketRef.current.close();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setTranscript('');
    log('✅ Stopped');
  };

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      minHeight: '100vh'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
        🎤 Nara - Simple Electron Test
      </h1>

      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <strong>Configuration:</strong><br/>
        • Vapi Assistant: Nara STT-Only ({CONFIG.vapi.assistantId})<br/>
        • ElevenLabs Voice: {CONFIG.elevenlabs.voiceId}<br/>
        • Mode: STT → Mock Response → TTS
      </div>

      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '15px',
        borderRadius: '10px',
        marginBottom: '20px',
        fontFamily: 'monospace'
      }}>
        <strong>Status:</strong> {status}
      </div>

      <div style={{ marginBottom: '20px' }}>
        {!isListening ? (
          <button
            onClick={startListening}
            style={{
              background: 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
              border: 'none',
              color: 'white',
              padding: '15px 30px',
              borderRadius: '25px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            🎤 Start Listening
          </button>
        ) : (
          <button
            onClick={stopListening}
            style={{
              background: '#666',
              border: 'none',
              color: 'white',
              padding: '15px 30px',
              borderRadius: '25px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            ⏹️ Stop Listening
          </button>
        )}
      </div>

      <div style={{
        background: 'rgba(0, 255, 0, 0.1)',
        border: '2px solid rgba(0, 255, 0, 0.3)',
        padding: '20px',
        borderRadius: '10px',
        minHeight: '60px',
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
        <strong>Transcript:</strong> {transcript || 'Say something...'}
      </div>
    </div>
  );
};

export default SimpleVapiTest;
