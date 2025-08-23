import { NextRequest, NextResponse } from 'next/server';
import { LangGraphRunner } from '../../../../agents/langgraph/adapters/Runner';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { convertConvexToCanonical, validateConvexAudiobook } from '../../../../agents/langgraph/utils/convexAdapter';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { transcript, prompt, bookContext } = await request.json();
    
    if (!transcript) {
      return NextResponse.json(
        { error: 'Missing transcript' },
        { status: 400 }
      );
    }
    
    // Get audiobook data from Convex for proper context
    let transcriptData = null;
    if (bookContext?.audiobookId) {
      try {
        const audiobook = await convex.query(api.audiobooks.getAudiobook, {
          audiobookId: bookContext.audiobookId as any
        });
        
        if (audiobook) {
          const validation = validateConvexAudiobook(audiobook);
          if (validation.isValid) {
            transcriptData = convertConvexToCanonical(audiobook);
            console.log(`[API] Loaded audiobook context: ${audiobook.title}`);
          }
        }
      } catch (error) {
        console.log('[API] Could not load audiobook context:', error);
      }
    }
    
    // If no audiobook context, use Zero to One as fallback
    if (!transcriptData) {
      try {
        const zeroToOne = await convex.query(api.audiobooks.getAudiobookByYouTubeId, {
          youtubeVideoId: 'ZoYgZcNFJVU'
        });
        if (zeroToOne) {
          transcriptData = convertConvexToCanonical(zeroToOne);
          console.log('[API] Using Zero to One as context for note generation');
        }
      } catch (error) {
        console.log('[API] Could not load Zero to One fallback:', error);
      }
    }
    
    if (!transcriptData) {
      return NextResponse.json(
        { error: 'Could not load audiobook context for note generation' },
        { status: 500 }
      );
    }
    
    // Use LangGraph Runner's dedicated note generation method
    const runner = new LangGraphRunner();
    
    // Use the built-in note generation method which handles formatting properly
    const cleanResult = await runner.generateNote({
      transcript,
      context: {
        transcriptData,
        audiobookId: bookContext?.audiobookId,
        chapterIdx: bookContext?.chapterIdx
      }
    });
    
    return NextResponse.json({ result: cleanResult });
  } catch (error) {
    console.error('[API] Generate note error:', error);
    return NextResponse.json(
      { error: 'Failed to generate note', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Format LangGraph output as actionable note
 */
function formatAsNote(markdown: string): string {
  const lines = markdown.split('\n').filter(l => l.trim());
  
  // Extract title
  let title = lines.find(l => !l.startsWith('•') && !l.startsWith('-') && !l.startsWith('*'));
  if (title) {
    title = title.replace(/^#+\s*/, '').trim();
  } else {
    title = 'Discussion Notes';
  }
  
  // Extract bullets (max 3)
  const bullets = lines
    .filter(l => l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || /^\d+\./.test(l))
    .map(l => l.replace(/^[•\-*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
    .slice(0, 3);
  
  // Format
  let formatted = title + '\n\n';
  bullets.forEach(b => formatted += `• ${b}\n`);
  
  return formatted.trim();
}