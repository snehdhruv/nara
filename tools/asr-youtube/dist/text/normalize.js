export function normalizeText(text) {
    return text
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        // Fix common Unicode issues
        .replace(/'/g, "'") // Curly apostrophe to straight
        .replace(/"/g, '"') // Curly quote to straight
        .replace(/"/g, '"') // Curly quote to straight
        .replace(/–/g, '-') // En dash to hyphen
        .replace(/—/g, '-') // Em dash to hyphen
        // Remove extra spaces around punctuation
        .replace(/\s*([,.!?;:])\s*/g, '$1 ')
        // Remove multiple consecutive punctuation
        .replace(/([.!?]){2,}/g, '$1')
        // Trim and ensure single space after punctuation
        .trim()
        .replace(/([.!?])\s*$/g, '$1'); // Ensure sentence endings
}
export function cleanTranscriptionArtifacts(text) {
    return text
        // Remove common transcription artifacts
        .replace(/\[.*?\]/g, '') // Remove bracketed content like [Music], [Applause]
        .replace(/\(.*?\)/g, '') // Remove parenthetical content
        .replace(/\b(um|uh|er|ah)\b/gi, '') // Remove filler words
        .replace(/\.\.\./g, '') // Remove ellipses
        .replace(/--/g, ' ') // Convert dashes to spaces
        .trim();
}
export function isValidSentence(text) {
    const trimmed = text.trim();
    // Must have minimum length
    if (trimmed.length < 10)
        return false;
    // Must contain at least one word
    if (!/\w/.test(trimmed))
        return false;
    // Should not be all caps (likely artifact)
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 20)
        return false;
    // Should not be repetitive
    const words = trimmed.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 5 && uniqueWords.size / words.length < 0.3)
        return false;
    return true;
}
