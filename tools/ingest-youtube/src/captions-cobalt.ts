import { fetch } from 'undici';
import { roundToDecimals } from './util';

export interface CaptionSegment {
  start_s: number;
  end_s: number;
  text: string;
}

export interface CaptionOptions {
  lang?: string;
  fallbackAuto?: boolean;
}

interface CobaltResponse {
  status: string;
  text?: string;
  url?: string;
  pickerType?: string;
  picker?: Array<{
    type: string;
    url: string;
    thumb?: string;
  }>;
}

export async function fetchCaptionsCobalt(
  videoId: string,
  options: CaptionOptions = {}
): Promise<{ segments: CaptionSegment[], kind: 'human' | 'auto' }> {
  const { lang = 'en' } = options;
  
  try {
    console.log(`Extracting captions using Cobalt API for video: ${videoId}`);
    
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Call Cobalt API to get video info and subtitle URLs
    const cobaltResponse = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; IngestYoutube/1.0)'
      },
      body: JSON.stringify({
        url: videoUrl,
        vCodec: 'h264',
        vQuality: '720',
        aFormat: 'mp3',
        filenamePattern: 'classic',
        isAudioOnly: false,
        isTTFullAudio: false,
        isAudioMuted: false,
        dubLang: false,
        disableMetadata: false
      })
    });
    
    if (!cobaltResponse.ok) {
      throw new Error(`Cobalt API request failed: ${cobaltResponse.status}`);
    }
    
    const data = await cobaltResponse.json() as CobaltResponse;
    console.log('Cobalt response:', data.status);
    
    if (data.status !== 'success' && data.status !== 'picker') {
      throw new Error(`Cobalt API failed: ${data.status} - ${data.text || 'Unknown error'}`);
    }
    
    // For now, Cobalt doesn't directly provide subtitle extraction
    // But we can use it to verify the video exists and then try alternative subtitle sources
    
    console.log('Video verified via Cobalt, attempting subtitle extraction...');
    
    // Try to fetch subtitles directly from YouTube's subtitle API
    // This is a backup approach when yt-dlp fails
    const subtitleUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=vtt`;
    
    console.log('Attempting direct subtitle fetch...');
    const subtitleResponse = await fetch(subtitleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    
    if (!subtitleResponse.ok) {
      console.log('Direct subtitle fetch failed, trying auto-generated...');
      
      // Try auto-generated subtitles
      const autoSubtitleUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=vtt&kind=asr`;
      const autoResponse = await fetch(autoSubtitleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });
      
      if (!autoResponse.ok) {
        console.warn(`No captions available for video ${videoId} via Cobalt fallback`);
        return { segments: [], kind: 'auto' };
      }
      
      const vttContent = await autoResponse.text();
      console.log(`Downloaded auto subtitles: ${vttContent.length} characters`);
      
      const segments = parseVTT(vttContent);
      return { segments, kind: 'auto' };
    }
    
    const vttContent = await subtitleResponse.text();
    console.log(`Downloaded manual subtitles: ${vttContent.length} characters`);
    
    if (vttContent.length < 50) {
      console.warn(`Subtitle content too short for video ${videoId}`);
      return { segments: [], kind: 'auto' };
    }
    
    const segments = parseVTT(vttContent);
    console.log(`Parsed ${segments.length} caption segments via Cobalt fallback`);
    
    return { segments, kind: 'human' };
    
  } catch (error: any) {
    console.error(`Error extracting captions with Cobalt: ${error.message}`);
    throw error;
  }
}

function parseVTT(vttContent: string): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  
  // Remove VTT header and split by empty lines
  const content = vttContent.replace(/^WEBVTT.*?\n\n/gm, '');
  const blocks = content.split('\n\n').filter(block => block.trim());
  
  for (const block of blocks) {
    const lines = block.split('\n').filter(line => line.trim());
    if (lines.length < 2) continue;
    
    // Find the timestamp line (format: 00:00:01.000 --> 00:00:04.000)
    let timestampLine = '';
    let textLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timestampLine = lines[i];
        textLines = lines.slice(i + 1);
        break;
      }
    }
    
    if (!timestampLine) continue;
    
    // Parse timestamp
    const timeMatch = timestampLine.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
    if (!timeMatch) continue;
    
    const startTime = parseVTTTimeToSeconds(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
    const endTime = parseVTTTimeToSeconds(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
    
    // Clean and combine text
    const text = textLines.join(' ')
      .replace(/<[^>]*>/g, '') // Remove HTML/VTT tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    
    if (text && text.length > 0) {
      segments.push({
        start_s: roundToDecimals(startTime),
        end_s: roundToDecimals(endTime),
        text
      });
    }
  }
  
  return segments.sort((a, b) => a.start_s - b.start_s);
}

function parseVTTTimeToSeconds(hours: string, minutes: string, seconds: string, milliseconds: string): number {
  return parseInt(hours) * 3600 + 
         parseInt(minutes) * 60 + 
         parseInt(seconds) + 
         parseInt(milliseconds) / 1000;
}