import { parseChaptersFromDescription } from './parseDescription.js';
import { log, warn } from '../util/log.js';
export function reconcileChapters({ videoMeta, youtubeChapters }) {
    const { duration_s, description } = videoMeta;
    // Prefer YouTube chapters if available
    if (youtubeChapters && youtubeChapters.length > 0) {
        log(`Using ${youtubeChapters.length} YouTube chapters`);
        return buildChapters(youtubeChapters, duration_s);
    }
    // Try parsing from description
    const descriptionChapters = parseChaptersFromDescription(description, duration_s);
    if (descriptionChapters.length > 0) {
        log(`Using ${descriptionChapters.length} chapters parsed from description`);
        return buildChapters(descriptionChapters, duration_s);
    }
    // Fallback to single full chapter
    warn('No chapters found, creating single "Full" chapter');
    return [{
            idx: 1,
            title: 'Full',
            start_s: 0,
            end_s: duration_s
        }];
}
function buildChapters(rawChapters, duration_s) {
    // Normalize chapter format
    const normalizedChapters = rawChapters.map(ch => ({
        title: ch.title,
        time_s: ch.time_s ?? ch.start_s ?? 0
    })).sort((a, b) => a.time_s - b.time_s);
    // Build chapters with end times
    const chapters = [];
    for (let i = 0; i < normalizedChapters.length; i++) {
        const current = normalizedChapters[i];
        const next = normalizedChapters[i + 1];
        chapters.push({
            idx: i + 1,
            title: current.title,
            start_s: current.time_s,
            end_s: next ? next.time_s : duration_s
        });
    }
    // Validate chapters
    const validChapters = chapters.filter(ch => {
        if (ch.start_s >= ch.end_s) {
            warn(`Skipping invalid chapter: "${ch.title}" (start=${ch.start_s}, end=${ch.end_s})`);
            return false;
        }
        if (ch.end_s > duration_s) {
            warn(`Clamping chapter "${ch.title}" end time from ${ch.end_s} to ${duration_s}`);
            ch.end_s = duration_s;
        }
        return true;
    });
    // Ensure we have at least one chapter
    if (validChapters.length === 0) {
        return [{
                idx: 1,
                title: 'Full',
                start_s: 0,
                end_s: duration_s
            }];
    }
    // Re-index chapters
    validChapters.forEach((ch, i) => {
        ch.idx = i + 1;
    });
    return validChapters;
}
