/**
 * ChapterIndexResolver - Maps playback position to chapter index and enforces spoiler protection
 */

import { promises as fs } from 'fs';
import { Chapter, CanonicalTranscript } from '../../agents/langgraph/types';

export interface ChapterResolution {
  chapterIdx: number;
  chapterTitle: string;
  chapterStart: number;
  chapterEnd: number;
  positionInChapter: number;
}

export class ChapterIndexResolver {
  private datasetCache = new Map<string, CanonicalTranscript>();
  private chapterCache = new Map<string, Chapter[]>();

  constructor() {}

  /**
   * Resolve current playback position to chapter index
   */
  async resolveFromPosition(datasetPath: string, positionS: number): Promise<number> {
    const chapters = await this.getChapters(datasetPath);
    
    // Find the chapter that contains this position
    for (const chapter of chapters) {
      if (positionS >= chapter.start_s && positionS < chapter.end_s) {
        return chapter.idx;
      }
    }

    // If position is beyond last chapter, return last chapter
    if (positionS >= chapters[chapters.length - 1].end_s) {
      return chapters[chapters.length - 1].idx;
    }

    // If position is before first chapter, return first chapter
    return chapters[0].idx;
  }

  /**
   * Get detailed chapter information for a position
   */
  async resolveDetailedPosition(datasetPath: string, positionS: number): Promise<ChapterResolution> {
    const chapters = await this.getChapters(datasetPath);
    const chapterIdx = await this.resolveFromPosition(datasetPath, positionS);
    
    const chapter = chapters.find(c => c.idx === chapterIdx);
    if (!chapter) {
      throw new Error(`Chapter ${chapterIdx} not found`);
    }

    return {
      chapterIdx: chapter.idx,
      chapterTitle: chapter.title,
      chapterStart: chapter.start_s,
      chapterEnd: chapter.end_s,
      positionInChapter: positionS - chapter.start_s
    };
  }

  /**
   * Calculate allowed chapter index with spoiler protection
   * Returns the maximum chapter the user can access based on their progress
   */
  allowedIdx(playbackChapterIdx?: number, userProgressIdx?: number): number {
    // The user can access chapters up to their furthest progress
    // This prevents spoilers from future chapters they haven't heard yet
    const userProgress = userProgressIdx ?? 1;
    const currentChapter = playbackChapterIdx ?? 1;

    // If user is currently playing beyond their progress (e.g., skipped ahead),
    // still limit them to their actual progress to prevent spoilers
    // But if they're playing within their progress range, allow their full progress
    return Math.max(1, userProgress);
  }

  /**
   * Get safe chapter index for queries - enforces spoiler protection
   */
  async getSafeChapterIdx(
    datasetPath: string,
    positionS: number,
    userProgressIdx?: number
  ): Promise<number> {
    const playbackChapterIdx = await this.resolveFromPosition(datasetPath, positionS);
    return this.allowedIdx(playbackChapterIdx, userProgressIdx);
  }

  /**
   * Validate if a chapter is accessible to the user
   */
  isChapterAccessible(chapterIdx: number, userProgressIdx: number): boolean {
    return chapterIdx <= userProgressIdx;
  }

  /**
   * Get all chapters from dataset (with caching)
   */
  private async getChapters(datasetPath: string): Promise<Chapter[]> {
    // Check cache first
    if (this.chapterCache.has(datasetPath)) {
      return this.chapterCache.get(datasetPath)!;
    }

    // Load and cache dataset
    const dataset = await this.loadDataset(datasetPath);
    const chapters = dataset.chapters.sort((a, b) => a.idx - b.idx);
    
    this.chapterCache.set(datasetPath, chapters);
    return chapters;
  }

  /**
   * Load dataset from file (with caching)
   */
  private async loadDataset(datasetPath: string): Promise<CanonicalTranscript> {
    // Check cache first
    if (this.datasetCache.has(datasetPath)) {
      return this.datasetCache.get(datasetPath)!;
    }

    try {
      const fileContent = await fs.readFile(datasetPath, 'utf-8');
      const rawData = JSON.parse(fileContent);
      
      // Validate using Zod schema
      const dataset = CanonicalTranscript.parse(rawData);
      
      this.datasetCache.set(datasetPath, dataset);
      return dataset;

    } catch (error) {
      throw new Error(`Failed to load dataset from ${datasetPath}: ${error}`);
    }
  }

  /**
   * Get chapter title by index
   */
  async getChapterTitle(datasetPath: string, chapterIdx: number): Promise<string> {
    const chapters = await this.getChapters(datasetPath);
    const chapter = chapters.find(c => c.idx === chapterIdx);
    return chapter?.title ?? `Chapter ${chapterIdx}`;
  }

  /**
   * Get chapter time boundaries
   */
  async getChapterBounds(datasetPath: string, chapterIdx: number): Promise<{ start_s: number; end_s: number }> {
    const chapters = await this.getChapters(datasetPath);
    const chapter = chapters.find(c => c.idx === chapterIdx);
    
    if (!chapter) {
      throw new Error(`Chapter ${chapterIdx} not found`);
    }

    return {
      start_s: chapter.start_s,
      end_s: chapter.end_s
    };
  }

  /**
   * Find chapters within a time range
   */
  async getChaptersInRange(
    datasetPath: string, 
    startS: number, 
    endS: number
  ): Promise<Chapter[]> {
    const chapters = await this.getChapters(datasetPath);
    
    return chapters.filter(chapter => 
      // Chapter overlaps with the requested range
      !(chapter.end_s <= startS || chapter.start_s >= endS)
    );
  }

  /**
   * Get total duration of the audiobook
   */
  async getTotalDuration(datasetPath: string): Promise<number> {
    const dataset = await this.loadDataset(datasetPath);
    return dataset.source.duration_s;
  }

  /**
   * Get total number of chapters
   */
  async getTotalChapters(datasetPath: string): Promise<number> {
    const chapters = await this.getChapters(datasetPath);
    return chapters.length;
  }

  /**
   * Clear caches (useful for testing or memory management)
   */
  clearCache(): void {
    this.datasetCache.clear();
    this.chapterCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { datasets: number; chapters: number } {
    return {
      datasets: this.datasetCache.size,
      chapters: this.chapterCache.size
    };
  }
}