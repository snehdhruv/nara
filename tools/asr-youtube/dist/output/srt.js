import { safeWriteFile, ensureDir } from '../util/fsx.js';
import { log, success } from '../util/log.js';
import { join } from 'path';
export async function writeSRT(segments, videoId, outputDir) {
    log('Generating SubRip (SRT) subtitle file');
    const srtContent = generateSRTContent(segments);
    await ensureDir(outputDir);
    const filePath = join(outputDir, `${videoId}.srt`);
    await safeWriteFile(filePath, srtContent);
    success(`SRT file saved: ${filePath}`);
    return filePath;
}
function generateSRTContent(segments) {
    let srt = '';
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        // SRT uses H:MM:SS,mmm format
        const startTime = formatSRTTime(segment.start_s);
        const endTime = formatSRTTime(segment.end_s);
        srt += `${i + 1}\n`;
        srt += `${startTime} --> ${endTime}\n`;
        srt += `${segment.text}\n\n`;
    }
    return srt.trim();
}
function formatSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const h = hours.toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    const s = Math.floor(secs).toString().padStart(2, '0');
    const ms = Math.round((secs % 1) * 1000).toString().padStart(3, '0');
    return `${h}:${m}:${s},${ms}`;
}
