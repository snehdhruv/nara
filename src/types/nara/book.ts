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
}

export interface BookContent {
  text: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
}
