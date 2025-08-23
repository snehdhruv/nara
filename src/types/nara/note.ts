export interface Note {
  id: string;
  title: string;
  content: string;
  timestamp: number; // wall clock time in seconds
  audiobookPosition: number; // position in audiobook in seconds
  topic?: string; // Optional topic for organization
}
