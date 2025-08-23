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
  audiobookPosition: number,
  bookContext?: { audiobookId?: string; chapterIdx?: number }
): Promise<GeneratedNote> {
  const transcript = `User: ${userQuestion}\n\nAI: ${aiResponse}`;
  
  try {
    // Call to LangGraph note generation API with book context
    const response = await fetch('/api/generate-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        bookContext,
        prompt: `Analyze the transcript below. Identify what the reader/user needs. Then extract a minimum of 1 and maximum of 3 bullet points that really highlight the actionable takeaways from this conversation. Remember keep this as minimum as possible but use up to 3 bullet points if you feel there is a lot of high level information to extract

${transcript}

Respond with a title that summarizes the conversation actionable bullet points. Nothing more`
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate note');
    }
    
    const data = await response.json();
    
    // LangGraph now returns properly formatted notes, but may have curly braces
    let result = data.result || '';
    
    // Remove any surrounding curly braces that LangGraph might add
    result = result.replace(/^\s*\{\s*/, '').replace(/\s*\}\s*$/, '').trim();
    
    // If result is still empty or malformed, try to extract from raw response
    if (!result && data.answer_markdown) {
      result = data.answer_markdown;
      result = result.replace(/^\s*\{\s*/, '').replace(/\s*\}\s*$/, '').trim();
    }
    
    // Aggressive cleaning of answer_markdown artifacts
    result = result.replace(/["']?answer_markdown["']?\s*:\s*/gi, '');
    result = result.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
    result = result.replace(/\\n/g, '\n'); // Unescape newlines
    
    const lines = result.split('\n').filter((line: string) => line.trim());
    
    // Extract title (first non-bullet line) and bullet points
    let title = 'Voice Discussion'; // Default
    let bulletPoints: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Check for bullet points with various formats
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*') || /^\d+\./.test(trimmedLine)) {
        // This is a bullet point - clean it up
        const cleanedBullet = trimmedLine
          .replace(/^[•\-*]\s*/, '')
          .replace(/^\d+\.\s*/, '')
          .trim();
        if (cleanedBullet) {
          bulletPoints.push(cleanedBullet);
        }
      } else if (title === 'Voice Discussion' && !trimmedLine.startsWith('#')) {
        // This is likely the title (first non-bullet, non-header line)
        title = trimmedLine.replace(/^#*\s*/, '').trim();
      }
    }
    
    // If no structured content found, try to parse it as a single block
    if (bulletPoints.length === 0 && result.length > 0) {
      // Split by double newlines to separate title and content
      const sections = result.split('\n\n');
      if (sections.length >= 2) {
        title = sections[0].replace(/^#*\s*/, '').trim();
        // Convert remaining sections to bullet points
        for (let i = 1; i < sections.length; i++) {
          const section = sections[i].trim();
          if (section) {
            bulletPoints.push(section);
          }
        }
      } else {
        // Split by single newlines and treat each line as potential content
        const allLines = result.split('\n').filter((l: string) => l.trim());
        if (allLines.length > 1) {
          title = allLines[0].replace(/^#*\s*/, '').trim();
          // Use remaining lines as bullet points
          for (let i = 1; i < allLines.length; i++) {
            const line = allLines[i].trim();
            if (line) {
              bulletPoints.push(line);
            }
          }
        } else if (allLines.length === 1) {
          // Single line - split into title and bullet based on length
          const content = allLines[0].trim();
          if (content.length > 50) {
            // Long content - use first part as title, rest as bullet
            const firstSentence = content.split('.')[0];
            if (firstSentence.length < content.length) {
              title = firstSentence.trim();
              bulletPoints.push(content.substring(firstSentence.length + 1).trim());
            } else {
              title = 'Discussion Notes';
              bulletPoints.push(content);
            }
          } else {
            title = content;
            bulletPoints.push('Key discussion point captured');
          }
        }
      }
    }
    
    // Ensure we always have at least one bullet point
    if (bulletPoints.length === 0) {
      bulletPoints.push('Discussion captured from voice interaction');
    }
    
    return {
      title: title || 'Voice Discussion',
      bulletPoints: bulletPoints.slice(0, 3), // Maximum 3 bullet points  
      timestamp: Date.now() / 1000,
      audiobookPosition
    };
  } catch (error) {
    console.error('[NoteGeneration] Failed to generate actionable note:', error);
    throw error; // No fallbacks, let it fail properly
  }
}

/**
 * Format note for display in the notes panel
 */
export function formatNoteForDisplay(note: GeneratedNote): string {
  return note.bulletPoints.map(point => `• ${point}`).join('\n');
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