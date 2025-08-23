import { NextRequest, NextResponse } from 'next/server';
import { LangGraphRunner } from '../../../../agents/langgraph/adapters/Runner';

export async function POST(request: NextRequest) {
  try {
    const { transcript, prompt, bookContext } = await request.json();
    
    if (!transcript) {
      return NextResponse.json(
        { error: 'Missing transcript' },
        { status: 400 }
      );
    }
    
    // Use LangGraph to generate actionable notes
    const runner = new LangGraphRunner();
    
    // Create a special note generation prompt that uses the existing QA system
    const notePrompt = prompt || `Analyze the transcript below. Identify what the reader/user needs. Then extract a minimum of 1 and maximum of 3 bullet points that really highlight the actionable takeaways from this conversation. Remember keep this as minimum as possible but use up to 3 bullet points if you feel there is a lot of high level information to extract

${transcript}

Respond with a title that summarizes the conversation actionable bullet points. Nothing more`;
    
    // Run through LangGraph with note generation mode
    const result = await runner.runWithNoteGeneration({
      prompt: notePrompt,
      context: bookContext || {},
      mode: 'note_generation'
    });
    
    return NextResponse.json({ result });
  } catch (error) {
    console.error('[API] Generate note error:', error);
    
    // Fallback to extraction if LangGraph fails
    const { transcript } = await request.json();
    const result = extractActionableInsights(transcript);
    
    return NextResponse.json({ result });
  }
}

/**
 * Fallback extraction when LangGraph is unavailable
 */
function extractActionableInsights(transcript: string): string {
  const lines = transcript.split('\n');
  
  // Extract key points from the conversation
  const userIdx = lines.findIndex(l => l.toLowerCase().startsWith('user:'));
  const aiIdx = lines.findIndex(l => l.toLowerCase().startsWith('ai:') || l.toLowerCase().startsWith('assistant:'));
  
  const userQuestion = userIdx >= 0 ? lines.slice(userIdx).join(' ').replace(/^user:/i, '').trim() : '';
  const aiResponse = aiIdx >= 0 ? lines.slice(aiIdx).join(' ').replace(/^(ai|assistant):/i, '').trim() : '';
  
  // Generate a title based on the question
  let title = 'Discussion Notes';
  if (userQuestion) {
    // Extract the main topic from the question
    const keywords = userQuestion.toLowerCase()
      .replace(/[?.,!]/g, '')
      .split(' ')
      .filter(word => word.length > 4 && !['what', 'where', 'when', 'which', 'how', 'about', 'there', 'would', 'could', 'should'].includes(word));
    
    if (keywords.length > 0) {
      title = keywords.slice(0, 3).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' ');
    }
  }
  
  // Extract actionable points from the AI response
  const bulletPoints: string[] = [];
  
  // Look for numbered lists or key phrases
  const sentences = aiResponse.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  sentences.forEach(sentence => {
    const cleaned = sentence.trim();
    
    // Check for actionable patterns
    if (
      /^(you can|you should|try|consider|remember|focus on|make sure|ensure)/i.test(cleaned) ||
      /\b(important|key|crucial|essential|must|need to|have to)\b/i.test(cleaned) ||
      /^\d+[\.\)]/i.test(cleaned) // Numbered lists
    ) {
      // Clean up the sentence
      const point = cleaned
        .replace(/^\d+[\.\)]\s*/, '') // Remove numbering
        .replace(/^(you can|you should|try to|consider|remember to|focus on|make sure to|ensure that)\s+/i, '')
        .trim();
      
      if (point.length > 15 && bulletPoints.length < 3) {
        // Capitalize first letter
        bulletPoints.push(point.charAt(0).toUpperCase() + point.slice(1));
      }
    }
  });
  
  // If no actionable points found, extract the most important sentences
  if (bulletPoints.length === 0) {
    const importantSentences = sentences
      .filter(s => s.length > 20)
      .slice(0, 2)
      .map(s => s.trim().charAt(0).toUpperCase() + s.trim().slice(1));
    
    bulletPoints.push(...importantSentences);
  }
  
  // Format the response
  let response = title + '\n\n';
  bulletPoints.forEach(point => {
    response += `• ${point}\n`;
  });
  
  return response.trim();
}