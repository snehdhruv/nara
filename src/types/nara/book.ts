export interface Book {
  id: string;
  title: string;
  author: string;
  narrator: string;
  coverUrl: string;
  duration: number; // in seconds
  currentChapter: number;
  chapterTitle: string;
  content: BookContent[];
  // Spotify integration fields
  spotifyUri?: string;
  description?: string;
  totalEpisodes?: number;
  languages?: string[];
  progress?: number; // 0 to 1
  lastPosition?: number; // in seconds
}

export interface BookContent {
  text: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
}

// Spotify audiobook data structure
export interface SpotifyAudiobook {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  totalEpisodes: number;
  languages: string[];
  spotifyUri: string;
  external_urls?: any;
}

export interface SpotifyEpisode {
  id: string;
  title: string;
  description: string;
  duration_ms: number;
  duration: number; // in seconds
  release_date: string;
  spotifyUri: string;
  external_urls?: any;
}
