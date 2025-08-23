import ytdl from 'ytdl-core';
import { createTempFile, type TempFile } from '../util/fsx';
import { log, progress, error } from '../util/log';

export interface VideoMeta {
  title: string;
  channel: string;
  duration_s: number;
  description: string;
}

export async function getVideoMeta(videoId: string): Promise<VideoMeta> {
  log(`Fetching metadata for video: ${videoId}`);
  
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    // Try ytdl-core first
    const info = await ytdl.getInfo(videoUrl);
    const videoDetails = info.videoDetails;
    
    return {
      title: videoDetails.title,
      channel: videoDetails.author.name,
      duration_s: parseInt(videoDetails.lengthSeconds),
      description: videoDetails.description || ''
    };
  } catch (ytdlError: any) {
    log(`ytdl-core failed: ${ytdlError.message}, trying yt-dlp for metadata...`);
    
    // Fallback to yt-dlp for metadata
    const { join } = await import('path');
    const YTDlpWrapModule = await import('yt-dlp-wrap');
    const YTDlpWrap = YTDlpWrapModule.default;
    
    const ytDlpPath = join(process.cwd(), 'node_modules/@distube/yt-dlp/bin/yt-dlp');
    const ytDlpWrap = new YTDlpWrap(ytDlpPath);
    
    const result = await ytDlpWrap.execPromise([
      videoUrl,
      '--print-json',
      '--skip-download'
    ]);
    
    const metadata = JSON.parse(result);
    
    return {
      title: metadata.title || 'Unknown Title',
      channel: metadata.uploader || metadata.channel || 'Unknown Channel',
      duration_s: metadata.duration || 0,
      description: metadata.description || ''
    };
  }
}

export async function extractAudioTemp(videoId: string): Promise<TempFile> {
  progress(`Extracting audio for video: ${videoId}`);
  
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const tempFile = await createTempFile('.audio');
  
  try {
    // Use yt-dlp to extract audio directly
    const { join } = await import('path');
    const YTDlpWrapModule = await import('yt-dlp-wrap');
    const YTDlpWrap = YTDlpWrapModule.default;
    
    const ytDlpPath = join(process.cwd(), 'node_modules/@distube/yt-dlp/bin/yt-dlp');
    const ytDlpWrap = new YTDlpWrap(ytDlpPath);
    
    // Download best available audio format without conversion
    progress('Downloading raw audio with yt-dlp...');
    await ytDlpWrap.execPromise([
      videoUrl,
      '--format', 'bestaudio',
      '--output', tempFile.path.replace('.audio', '.%(ext)s'),
      '--no-playlist'
    ]);
    
    // Find the actual downloaded file
    const fs = await import('fs/promises');
    const path = await import('path');
    const { dirname: pathDirname, basename } = path;
    
    const tempDir = pathDirname(tempFile.path);
    const baseFileName = basename(tempFile.path, '.audio');
    const files = await fs.readdir(tempDir);
    const downloadedFile = files.find(f => f.startsWith(baseFileName) && f !== basename(tempFile.path));
    
    if (!downloadedFile) {
      throw new Error('Could not find downloaded audio file');
    }
    
    const actualPath = path.join(tempDir, downloadedFile);
    progress(`Audio downloaded to: ${actualPath}`);
    
    // Return a temp file object with the actual path
    return {
      path: actualPath,
      async cleanup() {
        try {
          await fs.unlink(actualPath);
        } catch (error) {
          // File may already be deleted, ignore error
        }
        // Also clean up the original temp file if it exists
        await tempFile.cleanup();
      }
    };
    
  } catch (err: any) {
    error(`Audio extraction failed: ${err.message}`);
    await tempFile.cleanup();
    throw err;
  }
}