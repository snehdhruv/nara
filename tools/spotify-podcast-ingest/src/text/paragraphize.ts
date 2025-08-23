import { normalizeText, cleanPodcastArtifacts, isValidSegment } from './normalize.js';
import { log } from '../util/log.js';
import type { TranscriptSegment } from '../transcripts/proto/decode.js';

export interface ParagraphSegment {
  chapter_idx: number;
  start_s: number;
  end_s: number;
  text: string;
}

export interface ParagraphizeOptions {
  minSentences: number;
  maxSentences: number;
}

export function paragraphizeSegments(
  segments: Array<TranscriptSegment & { chapter_idx: number }>, 
  options: ParagraphizeOptions
): ParagraphSegment[] {
  const { minSentences, maxSentences } = options;
  log(`Paragraphizing ${segments.length} segments (${minSentences}-${maxSentences} sentences per paragraph)`);
  
  const paragraphs: ParagraphSegment[] = [];
  
  // Group by chapter
  const chapterGroups = new Map<number, Array<TranscriptSegment & { chapter_idx: number }>>();
  for (const segment of segments) {
    if (!chapterGroups.has(segment.chapter_idx)) {
      chapterGroups.set(segment.chapter_idx, []);
    }
    chapterGroups.get(segment.chapter_idx)!.push(segment);
  }
  
  // Process each chapter
  for (const [chapterIdx, chapterSegments] of chapterGroups) {
    const chapterParagraphs = createParagraphs(chapterSegments, options);
    paragraphs.push(...chapterParagraphs.map(p => ({ ...p, chapter_idx: chapterIdx })));
  }
  
  log(`Created ${paragraphs.length} paragraph blocks`);
  return paragraphs;
}

function createParagraphs(
  segments: Array<TranscriptSegment & { chapter_idx: number }>, 
  options: ParagraphizeOptions
): Array<Omit<ParagraphSegment, 'chapter_idx'>> {
  const { minSentences, maxSentences } = options;
  const paragraphs: Array<Omit<ParagraphSegment, 'chapter_idx'>> = [];
  
  let currentParagraph: Array<TranscriptSegment> = [];
  let currentSentenceCount = 0;
  
  for (const segment of segments) {
    // Clean and normalize the text
    let cleanText = cleanPodcastArtifacts(segment.text);
    cleanText = normalizeText(cleanText);
    
    // Skip invalid segments
    if (!isValidSegment(cleanText)) {
      continue;
    }
    
    // Count sentences in this segment (approximate)
    const segmentSentences = countSentences(cleanText);
    
    // Add segment to current paragraph
    currentParagraph.push({ ...segment, text: cleanText });
    currentSentenceCount += segmentSentences;
    
    // Check if we should close this paragraph
    const shouldClose = currentSentenceCount >= minSentences && (
      currentSentenceCount >= maxSentences ||
      cleanText.endsWith('.') ||
      cleanText.endsWith('!') ||
      cleanText.endsWith('?') ||
      // Natural break points in podcasts
      isNaturalBreak(cleanText)
    );
    
    if (shouldClose && currentParagraph.length > 0) {
      paragraphs.push(finalizeParagraph(currentParagraph));
      currentParagraph = [];
      currentSentenceCount = 0;
    }
  }
  
  // Handle remaining segments
  if (currentParagraph.length > 0) {
    paragraphs.push(finalizeParagraph(currentParagraph));
  }
  
  return paragraphs;
}

function countSentences(text: string): number {
  // Simple sentence counting - split by sentence-ending punctuation
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  return Math.max(1, sentences.length);
}

function isNaturalBreak(text: string): boolean {
  // Detect natural paragraph breaks in podcast speech
  const lowerText = text.toLowerCase().trim();
  
  // Topic transition words/phrases
  const transitionPhrases = [
    'moving on', 'next up', 'speaking of', 'by the way', 
    'on another note', 'meanwhile', 'in other news',
    'let me tell you', 'here\'s the thing', 'you know what'
  ];
  
  return transitionPhrases.some(phrase => lowerText.includes(phrase));
}

function finalizeParagraph(segments: TranscriptSegment[]): Omit<ParagraphSegment, 'chapter_idx'> {
  const start_s = segments[0].start_s;
  const end_s = segments[segments.length - 1].end_s;
  const text = segments.map(s => s.text).join(' ').trim();
  
  return {
    start_s,
    end_s,
    text: normalizeText(text)
  };
}