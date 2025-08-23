import { normalizeText, cleanTranscriptionArtifacts, isValidSentence } from './normalize.js';
import { log } from '../util/log.js';
export function paragraphizeSegments(segments, options) {
    const { minSentences, maxSentences } = options;
    log(`Paragraphizing ${segments.length} segments (${minSentences}-${maxSentences} sentences per paragraph)`);
    const paragraphs = [];
    // Group by chapter
    const chapterGroups = new Map();
    for (const segment of segments) {
        if (!chapterGroups.has(segment.chapter_idx)) {
            chapterGroups.set(segment.chapter_idx, []);
        }
        chapterGroups.get(segment.chapter_idx).push(segment);
    }
    // Process each chapter
    for (const [chapterIdx, chapterSegments] of chapterGroups) {
        const chapterParagraphs = createParagraphs(chapterSegments, options);
        paragraphs.push(...chapterParagraphs.map(p => ({ ...p, chapter_idx: chapterIdx })));
    }
    log(`Created ${paragraphs.length} paragraph blocks`);
    return paragraphs;
}
function createParagraphs(segments, options) {
    const { minSentences, maxSentences } = options;
    const paragraphs = [];
    let currentParagraph = [];
    let currentSentenceCount = 0;
    for (const segment of segments) {
        // Clean and normalize the text
        let cleanText = cleanTranscriptionArtifacts(segment.text);
        cleanText = normalizeText(cleanText);
        // Skip invalid segments
        if (!isValidSentence(cleanText)) {
            continue;
        }
        // Count sentences in this segment (approximate)
        const segmentSentences = countSentences(cleanText);
        // Add segment to current paragraph
        currentParagraph.push({ ...segment, text: cleanText });
        currentSentenceCount += segmentSentences;
        // Check if we should close this paragraph
        const shouldClose = currentSentenceCount >= minSentences && (currentSentenceCount >= maxSentences ||
            cleanText.endsWith('.') ||
            cleanText.endsWith('!') ||
            cleanText.endsWith('?'));
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
function countSentences(text) {
    // Simple sentence counting - split by sentence-ending punctuation
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return Math.max(1, sentences.length);
}
function finalizeParagraph(segments) {
    const start_s = segments[0].start_s;
    const end_s = segments[segments.length - 1].end_s;
    const text = segments.map(s => s.text).join(' ').trim();
    return {
        start_s,
        end_s,
        text: normalizeText(text)
    };
}
