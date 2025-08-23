import { NextRequest, NextResponse } from 'next/server';
import { TTSService } from '../../../../main/audio/TTSService';
import { getAudioConfig } from '../../../../main/audio/config';

// Create a single TTS instance to reuse
let ttsInstance: TTSService | null = null;

async function getTTSService() {
  if (!ttsInstance) {
    try {
      const audioConfig = getAudioConfig();
      const tts = new TTSService(audioConfig.tts);
      await tts.initialize();
      ttsInstance = tts;
      console.log('[TTS API] TTS service initialized');
    } catch (error) {
      console.error('[TTS API] TTS initialization failed:', error);
      throw error;
    }
  }
  return ttsInstance;
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      );
    }

    console.log(`[TTS API] Synthesizing: "${text.substring(0, 50)}..."`);
    
    const tts = await getTTSService();
    const result = await tts.synthesizeText(text.trim(), { priority: 'high' });
    
    // Convert stream to buffer
    const chunks: Buffer[] = [];
    
    for await (const chunk of result.audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    
    const audioBuffer = Buffer.concat(chunks);
    
    console.log(`[TTS API] Audio generated: ${audioBuffer.length} bytes`);
    
    // Return audio as MP3
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('[TTS API] Request failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'TTS failed'
      },
      { status: 500 }
    );
  }
}