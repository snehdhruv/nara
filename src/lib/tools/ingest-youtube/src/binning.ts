import { Chapter, Segment, Paragraph } from './schema';
import { CaptionSegment } from './captions-ytdlp';
import { roundToDecimals } from './util';

export interface BinningOptions {
  minParagraphSentences?: number;
  maxParagraphSentences?: number;
}

export function binSegmentsIntoChapters(
  captionSegments: CaptionSegment[],
  chapters: Chapter[],
  options: BinningOptions = {}
): { segments: Segment[], paragraphs: Paragraph[] } {
  const { minParagraphSentences = 2, maxParagraphSentences = 4 } = options;
  
  const segments: Segment[] = [];
  const paragraphsByChapter: Map<number, Paragraph[]> = new Map();
  
  for (const chapter of chapters) {
    const chapterSegments: CaptionSegment[] = [];
    
    for (const caption of captionSegments) {
      if (caption.start_s >= chapter.start_s && caption.start_s < chapter.end_s) {
        const segment: Segment = {
          chapter_idx: chapter.idx,
          start_s: roundToDecimals(caption.start_s),
          end_s: roundToDecimals(caption.end_s),
          text: caption.text
        };
        segments.push(segment);
        chapterSegments.push(caption);
      }
    }
    
    const chapterParagraphs = createParagraphs(
      chapterSegments,
      chapter.idx,
      minParagraphSentences,
      maxParagraphSentences
    );
    paragraphsByChapter.set(chapter.idx, chapterParagraphs);
  }
  
  const paragraphs: Paragraph[] = [];
  for (const chapterParas of paragraphsByChapter.values()) {
    paragraphs.push(...chapterParas);
  }
  
  return { segments, paragraphs };
}

function createParagraphs(
  segments: CaptionSegment[],
  chapterIdx: number,
  minSentences: number,
  maxSentences: number
): Paragraph[] {
  if (segments.length === 0) return [];
  
  const paragraphs: Paragraph[] = [];
  let currentParagraph: CaptionSegment[] = [];
  let currentText = '';
  
  // Semantic indicators for breaking paragraphs - words/phrases that often start new thoughts
  const semanticBreakers = [
    // Transition words
    'however', 'therefore', 'furthermore', 'moreover', 'nevertheless', 'meanwhile', 'subsequently',
    'consequently', 'additionally', 'alternatively', 'specifically', 'particularly', 'essentially',
    // Topic shifts
    'now', 'so', 'well', 'but', 'and', 'also', 'then', 'next', 'first', 'second', 'finally',
    'in fact', 'for example', 'for instance', 'on the other hand', 'in contrast', 'in addition',
    // Questions/explanations
    'what', 'why', 'how', 'when', 'where', 'who', 'which', 'this is', 'that is', 'here is',
    'let me', 'we can', 'you can', 'if you', 'so what', 'the question', 'the problem'
  ];
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentParagraph.push(segment);
    currentText += ' ' + segment.text;
    
    // Count approximate sentences in accumulated text
    const sentenceCount = countSentencesInText(currentText);
    
    // Check for semantic breaks - look for transition words at start of segments
    const segmentStart = segment.text.toLowerCase().trim();
    const hasSemanticBreak = semanticBreakers.some(breaker => 
      segmentStart.startsWith(breaker + ' ') || segmentStart === breaker
    );
    
    // Natural ending detection (improved)
    const hasNaturalEnding = segment.text.match(/[.!?]\s*$/) || 
                           segment.text.match(/[.!?]\s+[A-Z]/) || // sentence ending followed by capital
                           (i < segments.length - 1 && segments[i + 1].text.match(/^[A-Z]/)); // next segment starts with capital
    
    // Duration check - don't make paragraphs too long
    const duration = currentParagraph.length > 0 ? 
      segment.end_s - currentParagraph[0].start_s : 0;
    const tooLong = duration > 45; // Max 45 seconds per paragraph
    
    // Word count check - aim for readable chunks
    const wordCount = currentText.split(/\s+/).filter(w => w.length > 0).length;
    const hasMinContent = wordCount >= 50; // At least 50 words
    const hasMaxContent = wordCount >= 200; // Max 200 words
    
    // Decision logic for splitting
    const shouldSplit = currentParagraph.length > 0 && (
      // We have enough content AND natural break
      (hasMinContent && (hasNaturalEnding || hasSemanticBreak)) ||
      // We have minimum sentences and natural ending
      (sentenceCount >= minSentences && hasNaturalEnding) ||
      // We hit maximum constraints
      (sentenceCount >= maxSentences) ||
      (hasMaxContent) ||
      (tooLong)
    );
    
    if (shouldSplit) {
      const text = currentParagraph.map(s => s.text).join(' ').trim();
      if (text.length > 10) { // At least some meaningful content
        paragraphs.push({
          chapter_idx: chapterIdx,
          start_s: roundToDecimals(currentParagraph[0].start_s),
          end_s: roundToDecimals(currentParagraph[currentParagraph.length - 1].end_s),
          text
        });
      }
      currentParagraph = [];
      currentText = '';
    }
  }
  
  // Don't forget the last paragraph
  if (currentParagraph.length > 0) {
    const text = currentParagraph.map(s => s.text).join(' ').trim();
    if (text.length > 10) {
      paragraphs.push({
        chapter_idx: chapterIdx,
        start_s: roundToDecimals(currentParagraph[0].start_s),
        end_s: roundToDecimals(currentParagraph[currentParagraph.length - 1].end_s),
        text
      });
    }
  }
  
  console.log(`Created ${paragraphs.length} semantic paragraphs from ${segments.length} segments`);
  return paragraphs;
}

function countSentences(text: string, abbreviations: string[]): number {
  let processedText = text;
  
  for (const abbr of abbreviations) {
    processedText = processedText.replace(new RegExp(abbr.replace('.', '\\.'), 'g'), abbr.replace('.', ''));
  }
  
  const matches = processedText.match(/[.!?]+[\s]|[.!?]+$/g);
  return matches ? matches.length : 0;
}

function countSentencesInText(text: string): number {
  // More aggressive sentence detection for captions
  const abbreviations = ['Mr.', 'Mrs.', 'Dr.', 'Ms.', 'Prof.', 'Sr.', 'Jr.', 'e.g.', 'i.e.', 'vs.', 'etc.'];
  
  let processedText = text;
  
  // Handle abbreviations
  for (const abbr of abbreviations) {
    processedText = processedText.replace(new RegExp(abbr.replace('.', '\\.'), 'g'), abbr.replace('.', ''));
  }
  
  // Count sentence endings
  const sentenceEndings = processedText.match(/[.!?]+/g);
  if (sentenceEndings) {
    return sentenceEndings.length;
  }
  
  // If no punctuation, estimate based on semantic patterns
  // Look for patterns that typically end sentences
  const semanticEndings = processedText.match(/\b(therefore|however|because|since|although|while|when|if|so|but|and then|after that)\s/gi);
  const questionStarters = processedText.match(/\b(what|why|how|when|where|who|which|can|could|would|should|is|are|do|does|did)\s/gi);
  
  // Rough estimate: one sentence per semantic pattern or question
  let estimatedSentences = 1; // At least one sentence
  if (semanticEndings) estimatedSentences += Math.ceil(semanticEndings.length / 2);
  if (questionStarters) estimatedSentences += Math.ceil(questionStarters.length / 3);
  
  return Math.min(estimatedSentences, 5); // Cap at 5 to avoid over-estimation
}