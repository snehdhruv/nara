export type ChapterMap = {
  audiobook: {
    id: string;                  // slug or UUID
    title: string;
    language: string;
    spotifyAudiobookUri?: string;
  };
  chapters: Array<{
    idx: number;                 // 1-based order
    title: string;
    spotifyChapterUri?: string;  // e.g. "spotify:chapter:abc"
    startMs?: number | null;     // optional; often 0
    endMs?: number | null;       // optional
  }>;
};

export type ChapterTranscript = {
  audiobookId: string;
  idx: number;
  text?: string; // raw text blob
  segments?: Array<{ startMs: number; endMs: number; text: string }>;
  rights: "public_domain" | "owner_ok" | "website_transcript" | "unknown";
};

export type UserProgress = {
  userId: string;
  audiobookId: string;
  currentIdx: number;
  completed: number[];
};

// Convex database types
export type Audiobook = {
  _id: string;
  slug: string;
  title: string;
  language: string;
  spotifyAudiobookUri?: string;
};

export type Chapter = {
  _id: string;
  audiobookId: string;
  idx: number;
  title: string;
  spotifyChapterUri?: string;
  startMs?: number;
  endMs?: number;
};

export type ChapterTranscriptDoc = {
  _id: string;
  audiobookId: string;
  idx: number;
  text?: string;
  segments?: Array<{ startMs: number; endMs: number; text: string }>;
  rights: "public_domain" | "owner_ok" | "website_transcript" | "unknown";
};

export type UserProgressDoc = {
  _id: string;
  userId: string;
  audiobookId: string;
  currentIdx: number;
  completed: number[];
};
