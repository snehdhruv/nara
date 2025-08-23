import type { Segment, AnthropicMessage } from './types';

export function paragraphsFromSegments(segments: Segment[]): string[] {
  // Merge segments into paragraph blocks (2-4 sentences each)
  const paragraphs: string[] = [];
  let currentParagraph = '';
  let sentenceCount = 0;
  
  for (const segment of segments) {
    const sentences = segment.text.split(/[.!?]+/).filter(s => s.trim());
    
    for (const sentence of sentences) {
      currentParagraph += sentence.trim() + '. ';
      sentenceCount++;
      
      // Create paragraph after 2-4 sentences
      if (sentenceCount >= 2 && (sentenceCount >= 4 || Math.random() > 0.5)) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = '';
        sentenceCount = 0;
      }
    }
  }
  
  // Add remaining content
  if (currentParagraph.trim()) {
    paragraphs.push(currentParagraph.trim());
  }
  
  return paragraphs;
}

export function selectByKeywords(segments: Segment[], keywords: string[]): Segment[] {
  // Score segments by keyword hits
  const scoredSegments = segments.map((segment, idx) => {
    const text = segment.text.toLowerCase();
    let score = 0;
    
    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      // Count occurrences of keyword
      const matches = (text.match(new RegExp(lowerKeyword, 'g')) || []).length;
      score += matches;
    }
    
    return { segment, idx, score };
  });
  
  // Select segments with score > 0 and include neighbors
  const selectedIndices = new Set<number>();
  
  for (const item of scoredSegments) {
    if (item.score > 0) {
      // Add the segment and its neighbors
      selectedIndices.add(item.idx);
      if (item.idx > 0) selectedIndices.add(item.idx - 1);
      if (item.idx < segments.length - 1) selectedIndices.add(item.idx + 1);
    }
  }
  
  // Return selected segments in order
  return Array.from(selectedIndices)
    .sort((a, b) => a - b)
    .map(idx => segments[idx]);
}

export function formatTimeTag(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `[t=${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
}

export function buildMessages(params: {
  systemGlobal: string;
  systemPerCall: string;
  question: string;
  chapterBlock: string;
  priorBullets?: string[];
  userMemory?: string;
}): AnthropicMessage[] {
  const { systemGlobal, systemPerCall, question, chapterBlock, priorBullets, userMemory } = params;
  
  const messages: AnthropicMessage[] = [];
  
  // Combine system prompts
  const systemContent = systemGlobal + '\n\n' + systemPerCall;
  
  // Build context content
  let contextContent = '## Current Chapter Content\n\n' + chapterBlock;
  
  if (priorBullets && priorBullets.length > 0) {
    contextContent += '\n\n## Prior Chapter Summaries\n\n' + priorBullets.join('\n');
  }
  
  if (userMemory) {
    contextContent += '\n\n## User Notes\n\n' + userMemory;
  }
  
  // Add user message with context and question
  messages.push({
    role: 'user',
    content: contextContent + '\n\n## Question\n\n' + question
  });
  
  return messages;
}