export function log(message: string, ...args: any[]) {
  console.log(`[Spotify-Podcast] ${message}`, ...args);
}

export function warn(message: string, ...args: any[]) {
  console.warn(`[Spotify-Podcast] ⚠️  ${message}`, ...args);
}

export function error(message: string, ...args: any[]) {
  console.error(`[Spotify-Podcast] ❌ ${message}`, ...args);
}

export function success(message: string, ...args: any[]) {
  console.log(`[Spotify-Podcast] ✅ ${message}`, ...args);
}

export function progress(message: string, ...args: any[]) {
  console.log(`[Spotify-Podcast] 🔄 ${message}`, ...args);
}