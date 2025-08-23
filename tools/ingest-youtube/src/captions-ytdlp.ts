import YTDlpWrap from 'yt-dlp-wrap';
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

export async function fetchCaptionsYTDLP(
  videoId: string,
  options: CaptionOptions = {}
): Promise<{ segments: CaptionSegment[], kind: 'human' | 'auto' }> {
  const { lang = 'en' } = options;
  
  try {
    console.log(`Extracting captions using yt-dlp for video: ${videoId}`);
    
    const ytDlpWrap = new YTDlpWrap('./node_modules/@distube/yt-dlp/bin/yt-dlp');
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Get available subtitles first
    console.log('Checking available subtitles...');
    const subtitlesInfo = await ytDlpWrap.execPromise([
      videoUrl,
      '--list-subs',
      '--skip-download'
    ]);
    
    console.log('Available subtitles:', subtitlesInfo.substring(0, 500));
    
    // Extract captions in VTT format (more reliable than SRT for parsing)
    console.log(`Extracting captions in language: ${lang}`);
    
    const captionArgs = [
      videoUrl,
      '--write-subs',
      '--write-auto-subs',
      '--sub-langs', `${lang},${lang}.*`,
      '--sub-format', 'vtt',
      '--skip-download',
      '--output', `/tmp/%(id)s.%(ext)s`
    ];
    
    const result = await ytDlpWrap.execPromise(captionArgs);
    console.log('yt-dlp extraction result:', result.substring(0, 300));
    
    // Read the downloaded VTT file
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Find the VTT file
    const vttFiles = [
      `/tmp/${videoId}.${lang}.vtt`,
      `/tmp/${videoId}.${lang}.auto.vtt`,
      `/tmp/${videoId}.vtt`
    ];
    
    let vttContent = '';
    let captionType: 'human' | 'auto' = 'auto';
    
    for (const vttFile of vttFiles) {
      try {
        vttContent = await fs.readFile(vttFile, 'utf-8');
        captionType = vttFile.includes('.auto.') ? 'auto' : 'human';
        console.log(`Found captions in: ${vttFile} (${vttContent.length} characters)`);
        
        // Clean up the temp file
        await fs.unlink(vttFile).catch(() => {});
        break;
      } catch {
        // File doesn't exist, continue
      }
    }
    
    if (!vttContent) {
      throw new Error('No caption files were downloaded');
    }
    
    console.log('Sample VTT content:', vttContent.substring(0, 300));
    
    // Parse VTT content
    const segments = parseVTT(vttContent);
    console.log(`Parsed ${segments.length} caption segments`);
    
    if (segments.length > 0) {
      console.log('First segment:', segments[0]);
      console.log('Last segment:', segments[segments.length - 1]);
      
      const totalText = segments.map(s => s.text).join(' ');
      console.log(`Total text extracted: ${totalText.length} characters`);
      console.log(`Word count: ${totalText.split(/\s+/).length} words`);
      
      // Show sample from middle
      const middleIdx = Math.floor(segments.length / 2);
      console.log(`Sample from middle: "${segments[middleIdx].text}"`);
    }
    
    return { segments, kind: captionType };
    
  } catch (error: any) {
    // Check if error is due to rate limiting or specific YouTube blocks
    const errorMessage = error.message.toLowerCase();
    const isRateLimited = errorMessage.includes('429') || 
                         errorMessage.includes('too many requests') ||
                         errorMessage.includes('http error 429') ||
                         errorMessage.includes('rate limit');
    
    if (isRateLimited) {
      console.log('🔄 yt-dlp hit rate limit, falling back to Cobalt API...');
      
      try {
        const { fetchCaptionsCobalt } = await import('./captions-cobalt');
        return await fetchCaptionsCobalt(videoId, options);
      } catch (fallbackError: any) {
        console.error(`yt-dlp and Cobalt fallback failed: ${fallbackError.message}`);
        console.log('🔄 Trying ASR fallback with OpenAI Whisper...');
        
        try {
          const { fetchCaptionsASR } = await import('./captions-asr');
          return await fetchCaptionsASR(videoId, options);
        } catch (asrError: any) {
          console.error(`All methods failed: yt-dlp (rate limited), Cobalt (${fallbackError.message}), ASR (${asrError.message})`);
          throw new Error(`Caption extraction failed: All methods exhausted - yt-dlp (rate limited), Cobalt (${fallbackError.message}), ASR (${asrError.message})`);
        }
      }
    }
    
    console.error(`Error extracting captions with yt-dlp: ${error.message}`);
    throw error;
  }
}

function parseVTT(vttContent: string): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  
  // Remove VTT header and split by empty lines
  const content = vttContent.replace(/^WEBVTT.*?\n\n/s, '');
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