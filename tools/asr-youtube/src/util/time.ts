export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(p => parseFloat(p));
  
  if (parts.length === 3) {
    // H:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS format
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    // SS format
    return parts[0];
  }
  
  throw new Error(`Invalid time format: ${timeStr}`);
}

export function secondsToTimeString(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

export function roundToDecimals(num: number, decimals: number = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}