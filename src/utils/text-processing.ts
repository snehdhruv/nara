/**
 * Advanced text processing utilities for audiobook transcripts
 */

/**
 * Clean text by removing HTML entities and fixing formatting issues
 */
export function cleanTranscriptText(text: string): string {
  // Remove HTML entities
  let cleaned = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&ldquo;/gi, '"')
    .replace(/&rdquo;/gi, '"')
    .replace(/&lsquo;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '...');

  // Remove duplicate consecutive phrases (common in ASR)
  cleaned = removeDuplicatePhrases(cleaned);

  // Fix spacing issues
  cleaned = cleaned
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .replace(/\s+([.,!?;:])/g, '$1') // Remove space before punctuation
    .replace(/([.,!?;:])\s*([.,!?;:])/g, '$1$2') // Fix double punctuation
    .trim();

  return cleaned;
}

/**
 * Remove duplicate consecutive phrases from text
 */
function removeDuplicatePhrases(text: string): string {
  // Split into words
  const words = text.split(/\s+/);
  const result: string[] = [];
  
  // Check for repeated sequences of varying lengths (3-10 words)
  let i = 0;
  while (i < words.length) {
    let duplicateFound = false;
    
    // Try different phrase lengths
    for (let phraseLen = 10; phraseLen >= 3; phraseLen--) {
      if (i + phraseLen * 2 <= words.length) {
        const phrase1 = words.slice(i, i + phraseLen).join(' ');
        const phrase2 = words.slice(i + phraseLen, i + phraseLen * 2).join(' ');
        
        if (phrase1.toLowerCase() === phrase2.toLowerCase()) {
          // Found duplicate, skip the second occurrence
          result.push(...words.slice(i, i + phraseLen));
          i += phraseLen * 2;
          
          // Check if pattern continues
          while (i + phraseLen <= words.length) {
            const nextPhrase = words.slice(i, i + phraseLen).join(' ');
            if (nextPhrase.toLowerCase() === phrase1.toLowerCase()) {
              i += phraseLen;
            } else {
              break;
            }
          }
          
          duplicateFound = true;
          break;
        }
      }
    }
    
    if (!duplicateFound) {
      result.push(words[i]);
      i++;
    }
  }
  
  return result.join(' ');
}

/**
 * Split text into natural sentence boundaries
 */
export function splitIntoSentences(text: string): string[] {
  // Clean the text first
  const cleaned = cleanTranscriptText(text);
  
  // Advanced sentence splitting regex
  const sentenceEnders = /([.!?]+[\s\u200B]*)/;
  const parts = cleaned.split(sentenceEnders);
  
  const sentences: string[] = [];
  let current = '';
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    if (sentenceEnders.test(part)) {
      // This is punctuation
      current += part;
      
      // Check if next part starts with lowercase (might be continuation)
      const nextPart = parts[i + 1];
      if (nextPart && /^[a-z]/.test(nextPart.trim())) {
        // Continue accumulating
        continue;
      }
      
      // End of sentence
      if (current.trim()) {
        sentences.push(current.trim());
        current = '';
      }
    } else {
      current += part;
    }
  }
  
  // Add any remaining text
  if (current.trim()) {
    sentences.push(current.trim());
  }
  
  // Filter out very short sentences that might be artifacts
  return sentences.filter(s => s.length > 10 || /[.!?]$/.test(s));
}

/**
 * Group sentences into readable paragraphs based on content
 */
export function groupIntoParagraphs(sentences: string[], targetSentencesPerParagraph = 3): string[][] {
  const paragraphs: string[][] = [];
  let currentParagraph: string[] = [];
  
  for (let i = 0; i < sentences.length; i++) {
    currentParagraph.push(sentences[i]);
    
    // Check if we should start a new paragraph
    const shouldBreak = 
      currentParagraph.length >= targetSentencesPerParagraph ||
      sentences[i].endsWith('?') || // Questions often end paragraphs
      sentences[i].length > 150 || // Long sentences can stand alone
      (i < sentences.length - 1 && startsNewTopic(sentences[i], sentences[i + 1]));
    
    if (shouldBreak) {
      paragraphs.push([...currentParagraph]);
      currentParagraph = [];
    }
  }
  
  // Add remaining sentences
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph);
  }
  
  return paragraphs;
}

/**
 * Detect if there's a topic change between sentences
 */
function startsNewTopic(sentence1: string, sentence2: string): boolean {
  // Simple heuristic: check for dialogue markers, time changes, etc.
  const dialogueStarters = /^["']|^(He|She|They|I|You|We)\s+(said|asked|replied|answered)/i;
  const timeMarkers = /^(Then|Next|After|Before|Later|Finally|First|Second)/i;
  
  return dialogueStarters.test(sentence2) || timeMarkers.test(sentence2);
}

/**
 * Calculate optimal timing for each text segment
 */
export interface TextSegmentTiming {
  text: string;
  startTime: number;
  endTime: number;
  words: WordTiming[];
}

export interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
}

/**
 * Calculate word-level timing with natural pacing
 */
export function calculateWordTimings(
  text: string,
  startTime: number,
  endTime: number
): WordTiming[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const duration = endTime - startTime;
  
  // Calculate weight for each word based on length and complexity
  const weights = words.map(word => {
    let weight = 1.0;
    
    // Length factor
    weight *= Math.max(0.5, Math.min(2.0, word.length / 6));
    
    // Punctuation factor (pauses)
    if (/[.,;:]$/.test(word)) weight *= 1.2;
    if (/[.!?]$/.test(word)) weight *= 1.5;
    
    // Capitalization (proper nouns, sentence starts)
    if (/^[A-Z]/.test(word)) weight *= 1.1;
    
    // Numbers and special characters
    if (/\d/.test(word)) weight *= 1.3;
    
    return weight;
  });
  
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  // Distribute time based on weights
  const timings: WordTiming[] = [];
  let currentTime = startTime;
  
  words.forEach((word, index) => {
    const wordDuration = (weights[index] / totalWeight) * duration;
    timings.push({
      word,
      startTime: currentTime,
      endTime: currentTime + wordDuration
    });
    currentTime += wordDuration;
  });
  
  return timings;
}

/**
 * Find the active word at a given timestamp
 */
export function findActiveWord(
  words: WordTiming[],
  currentTime: number
): { index: number; progress: number; word: string } | null {
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (currentTime >= word.startTime && currentTime < word.endTime) {
      const progress = (currentTime - word.startTime) / (word.endTime - word.startTime);
      return { index: i, progress, word: word.word };
    }
  }
  
  // If past all words, return last word
  if (currentTime >= words[words.length - 1]?.endTime) {
    return { index: words.length - 1, progress: 1, word: words[words.length - 1]?.word || '' };
  }
  
  return null;
}