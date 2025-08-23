export interface Note {
  id: string;
  title: string;
  content: string;
  timestamp: number; // in seconds
  categories: {
    realized: string[];
    learned: string[];
    implement: string[];
  };
}
