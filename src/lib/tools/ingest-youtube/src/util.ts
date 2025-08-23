import fs from 'fs/promises';
import path from 'path';

export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.trim().split(':').map(p => parseInt(p, 10));
  
  if (parts.length === 1) {
    return parts[0];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  
  throw new Error(`Invalid time format: ${timeStr}`);
}

export function extractVideoId(urlOrId: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^[a-zA-Z0-9_-]{11}$/
  ];
  
  for (const pattern of patterns) {
    const match = urlOrId.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  
  throw new Error(`Invalid YouTube URL or video ID: ${urlOrId}`);
}

export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Failed to create directory ${dirPath}:`, error);
  }
}

export async function writeJsonFile(filePath: string, data: any): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDirectory(dir);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function readLinesFromFile(filePath: string): Promise<string[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  return content.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function roundToDecimals(num: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}