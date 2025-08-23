import { safeWriteFile, ensureDir } from '../util/fsx';
import { secondsToTimeString } from '../util/time';
import { log, success } from '../util/log';
import { join } from 'path';
import type { ParagraphSegment } from '../text/paragraphize';

export async function writeVTT(
  segments: ParagraphSegment[], 
  videoId: string, 
  outputDir: string
): Promise<string> {
  log('Generating WebVTT subtitle file');
  
  const vttContent = generateVTTContent(segments);
  
  await ensureDir(outputDir);
  const filePath = join(outputDir, `${videoId}.vtt`);
  
  await safeWriteFile(filePath, vttContent);
  
  success(`VTT file saved: ${filePath}`);
  return filePath;
}

function generateVTTContent(segments: ParagraphSegment[]): string {
  let vtt = 'WEBVTT\n\n';
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    // VTT uses H:MM:SS.mmm format
    const startTime = formatVTTTime(segment.start_s);
    const endTime = formatVTTTime(segment.end_s);
    
    vtt += `${i + 1}\n`;
    vtt += `${startTime} --> ${endTime}\n`;
    vtt += `${segment.text}\n\n`;
  }
  
  return vtt;
}

function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const h = hours.toString().padStart(2, '0');
  const m = minutes.toString().padStart(2, '0');
  const s = secs.toFixed(3).padStart(6, '0');
  
  return `${h}:${m}:${s}`;
}