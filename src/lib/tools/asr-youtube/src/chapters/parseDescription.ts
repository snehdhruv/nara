import { parseTimeToSeconds } from '../util/time';
import { log } from '../util/log';

export interface ParsedChapter {
  time_s: number;
  title: string;
}

export function parseChaptersFromDescription(description: string, duration_s: number): ParsedChapter[] {
  log('Parsing chapters from video description');
  
  const lines = description.split('\n');
  const chapters: ParsedChapter[] = [];
  
  // Regex patterns to match timestamp formats
  const patterns = [
    /^(\d{1,2}:\d{2}:\d{2})\s+(.+)$/,  // H:MM:SS Title
    /^(\d{1,2}:\d{2})\s+(.+)$/,        // MM:SS Title
    /^\[(\d{1,2}:\d{2}:\d{2})\]\s*(.+)$/, // [H:MM:SS] Title
    /^\[(\d{1,2}:\d{2})\]\s*(.+)$/,       // [MM:SS] Title
    /^(\d{1,2}:\d{2}:\d{2})\s*-\s*(.+)$/, // H:MM:SS - Title
    /^(\d{1,2}:\d{2})\s*-\s*(.+)$/        // MM:SS - Title
  ];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        try {
          const timeStr = match[1];
          const title = match[2].trim();
          const time_s = parseTimeToSeconds(timeStr);
          
          // Validate time is within video duration
          if (time_s >= 0 && time_s < duration_s && title) {
            chapters.push({ time_s, title });
            break; // Found match, move to next line
          }
        } catch (error) {
          // Invalid time format, skip this line
          continue;
        }
      }
    }
  }
  
  // Remove duplicates and sort by time
  const uniqueChapters = chapters
    .filter((chapter, index, arr) => 
      arr.findIndex(c => Math.abs(c.time_s - chapter.time_s) < 1) === index
    )
    .sort((a, b) => a.time_s - b.time_s);
  
  log(`Found ${uniqueChapters.length} chapters in description`);
  
  return uniqueChapters;
}