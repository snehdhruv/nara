import { Chapter } from './schema';
import { parseTimeToSeconds, roundToDecimals } from './util';

export function parseChaptersFromDescription(
  description: string,
  duration_s: number
): Chapter[] {
  const lines = description.split('\n');
  const chapters: Array<{ title: string; start_s: number }> = [];
  
  const timestampPatterns = [
    /^(\d{1,2}:\d{2}:\d{2})\s+(.+)$/,
    /^(\d{1,2}:\d{2})\s+(.+)$/,
    /^(.+?)\s+(\d{1,2}:\d{2}:\d{2})$/,
    /^(.+?)\s+(\d{1,2}:\d{2})$/
  ];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    for (const pattern of timestampPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        let timeStr: string;
        let title: string;
        
        if (pattern.source.startsWith('^(\\d')) {
          timeStr = match[1];
          title = match[2].trim();
        } else {
          title = match[1].trim();
          timeStr = match[2];
        }
        
        try {
          const start_s = parseTimeToSeconds(timeStr);
          if (start_s < duration_s) {
            chapters.push({ title, start_s });
          }
        } catch {
          continue;
        }
        break;
      }
    }
  }
  
  chapters.sort((a, b) => a.start_s - b.start_s);
  
  const deduped: typeof chapters = [];
  for (const ch of chapters) {
    if (deduped.length === 0 || ch.start_s !== deduped[deduped.length - 1].start_s) {
      deduped.push(ch);
    }
  }
  
  const result: Chapter[] = [];
  for (let i = 0; i < deduped.length; i++) {
    const current = deduped[i];
    const next = deduped[i + 1];
    
    result.push({
      idx: i + 1,
      title: current.title,
      start_s: roundToDecimals(current.start_s),
      end_s: roundToDecimals(next ? next.start_s : duration_s)
    });
  }
  
  return result;
}

export function reconcileChapters(
  youtubeChapters: Array<{ title: string; start_time: number }> | undefined,
  descriptionChapters: Chapter[],
  duration_s: number
): Chapter[] {
  if (youtubeChapters && youtubeChapters.length > 0) {
    const chapters: Chapter[] = [];
    
    for (let i = 0; i < youtubeChapters.length; i++) {
      const current = youtubeChapters[i];
      const next = youtubeChapters[i + 1];
      
      chapters.push({
        idx: i + 1,
        title: current.title,
        start_s: roundToDecimals(current.start_time),
        end_s: roundToDecimals(next ? next.start_time : duration_s)
      });
    }
    
    return chapters;
  }
  
  if (descriptionChapters.length > 0) {
    return descriptionChapters;
  }
  
  return [{
    idx: 1,
    title: 'Full',
    start_s: 0,
    end_s: roundToDecimals(duration_s)
  }];
}