/**
 * Advanced note generation service for voice interactions
 */

interface GeneratedNote {
  title: string;
  bulletPoints: string[];
  timestamp: number;
  audiobookPosition: number;
}

/**
 * Generate actionable notes from voice conversation transcripts
 */
export async function generateActionableNote(
  userQuestion: string,
  aiResponse: string,
  audiobookPosition: number
): Promise<GeneratedNote> {
  const transcript = `User: ${userQuestion}\n\nAI: ${aiResponse}`;
  
  try {
    // Call to OpenAI or local LLM for note generation
    const response = await fetch('/api/generate-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        prompt: `Analyze the transcript below. Identify what the reader/user needs. Then extract a minimum of 1 and maximum of 3 bullet points that really highlight the actionable takeaways from this conversation. Remember keep this as minimum as possible but use up to 3 bullet points if you feel there is a lot of high level information to extract

${transcript}

Respond with a title that summarizes the conversation actionable bullet points. Nothing more`
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate note');
    }
    
    const data = await response.json();
    
    // Parse the response to extract title and bullet points
    const lines = data.result.split('\n').filter((line: string) => line.trim());
    const title = lines[0].replace(/^#*\s*/, '').trim();
    
    const bulletPoints: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line)) {
        bulletPoints.push(
          line.replace(/^[•\-*]\s*/, '')
              .replace(/^\d+\.\s*/, '')
              .trim()
        );
      }
    }
    
    return {
      title,
      bulletPoints: bulletPoints.slice(0, 3), // Maximum 3 bullet points
      timestamp: Date.now() / 1000,
      audiobookPosition
    };
  } catch (error) {
    console.error('[NoteGeneration] Failed to generate actionable note:', error);
    
    // Fallback to simple extraction
    return {
      title: "Voice Discussion",
      bulletPoints: [userQuestion],
      timestamp: Date.now() / 1000,
      audiobookPosition
    };
  }
}

/**
 * Format note for display in the notes panel
 */
export function formatNoteForDisplay(note: GeneratedNote): string {
  let formatted = '';
  
  if (note.bulletPoints.length > 0) {
    formatted = note.bulletPoints.map(point => `• ${point}`).join('\n');
  }
  
  return formatted;
}

/**
 * Create a shareable note with metadata
 */
export interface ShareableNote {
  id: string;
  title: string;
  content: string;
  bulletPoints: string[];
  timestamp: number;
  audiobookPosition: number;
  bookId: string;
  bookTitle: string;
  chapterInfo?: {
    number: number;
    title: string;
  };
  audioContext?: {
    startTime: number;
    endTime: number;
    transcriptSnippet: string;
  };
}

/**
 * Enhance note with book context for sharing
 */
export function createShareableNote(
  note: GeneratedNote,
  bookContext: {
    bookId: string;
    bookTitle: string;
    currentChapter?: number;
    chapterTitle?: string;
  },
  audioContext?: {
    startTime: number;
    endTime: number;
    transcriptSnippet: string;
  }
): ShareableNote {
  return {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    title: note.title,
    content: formatNoteForDisplay(note),
    bulletPoints: note.bulletPoints,
    timestamp: note.timestamp,
    audiobookPosition: note.audiobookPosition,
    bookId: bookContext.bookId,
    bookTitle: bookContext.bookTitle,
    chapterInfo: bookContext.currentChapter ? {
      number: bookContext.currentChapter,
      title: bookContext.chapterTitle || `Chapter ${bookContext.currentChapter}`
    } : undefined,
    audioContext
  };
}

/**
 * Export note as beautiful social media card
 */
export function generateSocialCard(note: ShareableNote): string {
  const card = `
📚 ${note.bookTitle}
${note.chapterInfo ? `📖 ${note.chapterInfo.title}` : ''}

💡 ${note.title}

${note.bulletPoints.map(point => `• ${point}`).join('\n')}

🎧 Timestamp: ${Math.floor(note.audiobookPosition / 60)}:${(Math.floor(note.audiobookPosition) % 60).toString().padStart(2, '0')}

Created with Nara - Interactive Audiobooks 🎯
  `.trim();
  
  return card;
}

/**
 * Batch process multiple notes for study guide generation
 */
export async function generateStudyGuide(notes: ShareableNote[]): Promise<string> {
  if (notes.length === 0) return 'No notes available for study guide generation.';
  
  // Group notes by chapter
  const notesByChapter = new Map<number, ShareableNote[]>();
  
  notes.forEach(note => {
    const chapter = note.chapterInfo?.number || 0;
    if (!notesByChapter.has(chapter)) {
      notesByChapter.set(chapter, []);
    }
    notesByChapter.get(chapter)!.push(note);
  });
  
  // Build study guide
  let studyGuide = `# Study Guide: ${notes[0].bookTitle}\n\n`;
  studyGuide += `Generated from ${notes.length} voice interactions\n\n`;
  
  // Sort chapters
  const sortedChapters = Array.from(notesByChapter.keys()).sort((a, b) => a - b);
  
  sortedChapters.forEach(chapterNum => {
    const chapterNotes = notesByChapter.get(chapterNum)!;
    
    if (chapterNum > 0) {
      studyGuide += `## Chapter ${chapterNum}`;
      if (chapterNotes[0].chapterInfo?.title) {
        studyGuide += `: ${chapterNotes[0].chapterInfo.title}`;
      }
      studyGuide += '\n\n';
    } else {
      studyGuide += '## General Notes\n\n';
    }
    
    chapterNotes.forEach(note => {
      studyGuide += `### ${note.title}\n`;
      studyGuide += `*Position: ${Math.floor(note.audiobookPosition / 60)}:${(Math.floor(note.audiobookPosition) % 60).toString().padStart(2, '0')}*\n\n`;
      
      note.bulletPoints.forEach(point => {
        studyGuide += `- ${point}\n`;
      });
      
      studyGuide += '\n';
    });
  });
  
  return studyGuide;
}