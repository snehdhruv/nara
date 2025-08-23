import { NextRequest, NextResponse } from 'next/server';
import { createVoiceAgentBridge } from '../../../../main/audio/INTEGRATION_EXAMPLE';

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

export async function POST(request: NextRequest) {
  try {
    const { question, action } = await request.json();
    
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

      const bridge = await getBridge();
      const startTime = Date.now();
      
      console.log(`[API] Processing question: "${question}"`);
      
      const result = await bridge.processQuestion(question.trim());
      const totalTime = Date.now() - startTime;
      
      console.log(`[API] Question answered in ${totalTime}ms`);
      
      return NextResponse.json({
        success: true,
        result: {
          question,
          answer: result.markdown,
          citations: result.citations,
          playbackHint: result.playbackHint,
          latency: result.latency_ms,
          totalTime,
          interactionId: result.interactionId
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