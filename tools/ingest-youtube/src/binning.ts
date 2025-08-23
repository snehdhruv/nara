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
  let currentSentenceCount = 0;
  
  const abbreviations = ['Mr.', 'Mrs.', 'Dr.', 'Ms.', 'Prof.', 'Sr.', 'Jr.', 'e.g.', 'i.e.', 'vs.', 'etc.'];
  
  for (const segment of segments) {
    currentParagraph.push(segment);
    
    const sentenceCount = countSentences(segment.text, abbreviations);
    currentSentenceCount += sentenceCount;
    
    if (currentSentenceCount >= minSentences && 
        (currentSentenceCount >= maxSentences || segment.text.match(/[.!?]\s*$/))) {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.map(s => s.text).join(' ').trim();
        paragraphs.push({
          chapter_idx: chapterIdx,
          start_s: roundToDecimals(currentParagraph[0].start_s),
          end_s: roundToDecimals(currentParagraph[currentParagraph.length - 1].end_s),
          text
        });
        currentParagraph = [];
        currentSentenceCount = 0;
      }
    }
  }
  
  if (currentParagraph.length > 0) {
    const text = currentParagraph.map(s => s.text).join(' ').trim();
    paragraphs.push({
      chapter_idx: chapterIdx,
      start_s: roundToDecimals(currentParagraph[0].start_s),
      end_s: roundToDecimals(currentParagraph[currentParagraph.length - 1].end_s),
      text
    });
  }
  
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