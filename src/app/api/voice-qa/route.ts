import { NextRequest, NextResponse } from 'next/server';
import { createVoiceAgentBridge } from '../../../../main/audio/INTEGRATION_EXAMPLE';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { convertConvexToCanonical, validateConvexAudiobook } from '../../../../agents/langgraph/utils/convexAdapter';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Create a single bridge instance to reuse
let bridgeInstance: any = null;

async function getBridge() {
  if (!bridgeInstance) {
    try {
      const bridge = await createVoiceAgentBridge();
      await bridge.initialize();
      bridgeInstance = bridge;
      console.log('[API] Voice bridge initialized');
    } catch (error) {
      console.error('[API] Bridge initialization failed:', error);
      throw error;
    }
  }
  return bridgeInstance;
}

// Get audiobook data from Convex for voice context
async function getAudiobookForVoice(audiobookId: string, youtubeVideoId: string) {
  try {
    console.log(`[API] Fetching audiobook data from Convex: ${audiobookId} / ${youtubeVideoId}`);
    
    let audiobook = null;
    
    // Try to get by Convex ID first
    if (audiobookId && audiobookId !== 'null') {
      try {
        audiobook = await convex.query(api.audiobooks.getAudiobook, {
          audiobookId: audiobookId as any
        });
      } catch (error) {
        console.log('[API] Book not found by Convex ID, trying YouTube ID...');
      }
    }
    
    // Try by YouTube video ID if Convex ID didn't work
    if (!audiobook && youtubeVideoId && youtubeVideoId !== 'null') {
      try {
        audiobook = await convex.query(api.audiobooks.getAudiobookByYouTubeId, {
          youtubeVideoId: youtubeVideoId
        });
      } catch (error) {
        console.log('[API] Book not found by YouTube ID either');
      }
    }
    
    // Fallback to Zero to One if nothing found
    if (!audiobook) {
      console.log('[API] No audiobook found, falling back to Zero to One');
      try {
        audiobook = await convex.query(api.audiobooks.getAudiobookByYouTubeId, {
          youtubeVideoId: "dz_4Mjyqbqk"
        });
      } catch (error) {
        console.log('[API] Even Zero to One fallback failed');
        return null;
      }
    }
    
    return audiobook;
  } catch (error) {
    console.error('[API] Failed to fetch audiobook from Convex:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { question, action, context } = await request.json();
    
    if (action === 'test-connection') {
      const bridge = await getBridge();
      const status = await bridge.testConnection();
      return NextResponse.json({ 
        success: true, 
        status,
        message: 'Connection test completed'
      });
    }
    
    if (action === 'ask-question') {
      if (!question || question.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Question is required' },
          { status: 400 }
        );
      }

      // Get the current audiobook from Convex based on context
      const currentAudiobook = await getAudiobookForVoice(
        context?.audiobookId, 
        context?.youtubeVideoId
      );
      
      if (!currentAudiobook) {
        return NextResponse.json(
          { success: false, error: 'Audiobook not found' },
          { status: 404 }
        );
      }
      
      console.log(`[API] Using audiobook: "${currentAudiobook.title}" by ${currentAudiobook.author}`);
      console.log(`[API] Current position: ${context?.currentTime || 0}s`);

      // Validate and convert Convex audiobook to CanonicalTranscript format
      const validation = validateConvexAudiobook(currentAudiobook);
      if (!validation.isValid) {
        console.error('[API] Invalid audiobook data:', validation.errors);
        return NextResponse.json(
          { success: false, error: `Invalid audiobook data: ${validation.errors.join(', ')}` },
          { status: 400 }
        );
      }

      const transcriptData = convertConvexToCanonical(currentAudiobook);
      console.log(`[API] Converted to CanonicalTranscript: ${transcriptData.chapters.length} chapters, ${transcriptData.segments.length} segments`);

      const bridge = await getBridge();
      const startTime = Date.now();
      
      console.log(`[API] Processing question with VoiceAgentBridge → LangGraph: "${question}"`);
      
      // Use the new method that accepts dynamic transcript data
      const result = await bridge.processQuestionWithData(
        question.trim(), 
        transcriptData,
        {
          audiobookId: currentAudiobook._id,
          currentPosition_s: context?.currentTime || 0,
          playbackChapterIdx: context?.currentChapter || 1,
          userProgressIdx: 14 // Allow access to all chapters for now
        }
      );
      const totalTime = Date.now() - startTime;
      
      console.log(`[API] LangGraph answered in ${totalTime}ms`);
      
      // Clean markdown formatting for natural speech
      const cleanText = result.markdown
        .replace(/\*\*/g, '') // Remove bold formatting
        .replace(/\*/g, '') // Remove italic formatting
        .replace(/#+\s*/g, '') // Remove header formatting
        .replace(/^-\s*/gm, '') // Remove bullet points
        .replace(/`/g, '') // Remove code formatting
        .replace(/\n{2,}/g, '\n') // Replace multiple newlines with single
        .trim();
      
      console.log(`[API] Cleaned response for TTS: "${cleanText}"`);
      
      // Generate TTS for the response using 11labs via TTS API
      const baseUrl = request.url.replace('/voice-qa', '');
      const ttsResponse = await fetch(`${baseUrl}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText
        })
      });

      if (!ttsResponse.ok) {
        const errorText = await ttsResponse.text();
        console.error(`[API] 11labs TTS generation failed: ${ttsResponse.status} - ${errorText}`);
        return NextResponse.json(
          { success: false, error: `TTS generation failed: ${ttsResponse.status}` },
          { status: 500 }
        );
      }

      const audioBuffer = await ttsResponse.arrayBuffer();
      
      console.log(`[API] 11labs TTS generated: ${audioBuffer.byteLength} bytes`);
      
      return NextResponse.json({
        success: true,
        result: {
          question,
          answer: cleanText, // Return cleaned text instead of markdown
          citations: result.citations,
          playbackHint: result.playbackHint,
          latency: result.latency_ms,
          totalTime,
          interactionId: result.interactionId,
          audioBuffer: Buffer.from(audioBuffer).toString('base64') // Encode audio for JSON transport
        }
      });
    }
    
    if (action === 'get-info') {
      const bridge = await getBridge();
      const info = bridge.getChapterInfo();
      const context = bridge.getCurrentContext();
      
      return NextResponse.json({
        success: true,
        info: {
          chapterInfo: info,
          context: {
            audiobookId: context.audiobookId,
            currentPosition: context.currentPosition_s,
            userProgress: context.userProgressIdx,
            playbackChapter: context.playbackChapterIdx
          }
        }
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('[API] Request failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}