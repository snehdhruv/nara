/**
 * Convex Audiobook to CanonicalTranscript Converter
 * Transforms Convex audiobook data to the format expected by LangGraph
 */

import type { CanonicalTranscript, AudiobookSource, Chapter, Segment } from '../types';

export interface ConvexAudiobook {
  _id: string;
  title: string;
  author: string;
  narrator?: string;
  coverUrl?: string;
  duration: number;
  description?: string;
  youtubeVideoId?: string;
  totalChapters?: number;
  isYouTube: boolean;
  chapters?: Array<{
    idx: number;
    title: string;
    start_s: number;
    end_s: number;
  }>;
  content?: Array<{
    text: string;
    startTime: number;
    endTime: number;
  }>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Convert Convex audiobook data to CanonicalTranscript format
 */
export function convertConvexToCanonical(convexBook: ConvexAudiobook): CanonicalTranscript {
  console.log(`[ConvexAdapter] Converting "${convexBook.title}" to CanonicalTranscript`);

  // Convert source metadata
  const source: AudiobookSource = {
    platform: convexBook.isYouTube ? "youtube" : "http",
    video_id: convexBook.youtubeVideoId,
    title: convexBook.title,
    channel: convexBook.author, // Use author as channel
    duration_s: convexBook.duration,
    rights: "owner_ok", // Default value
    language: "en", // Default to English
    captions_kind: "human", // Assume human captions
    asr_provider: null,
    asr_model: null
  };

  // Convert chapters
  const chapters: Chapter[] = convexBook.chapters?.map(ch => ({
    idx: ch.idx,
    title: ch.title,
    start_s: ch.start_s,
    end_s: ch.end_s
  })) || [];

  // Convert content to segments
  const segments: Segment[] = [];
  
  if (convexBook.content && convexBook.chapters) {
    // Map content to chapters based on timestamps
    convexBook.content.forEach((contentItem, index) => {
      // Find which chapter this content belongs to
      const chapter = convexBook.chapters!.find(ch => 
        contentItem.startTime >= ch.start_s && contentItem.startTime < ch.end_s
      );
      
      const chapterIdx = chapter ? chapter.idx : 1; // Default to chapter 1
      
      segments.push({
        chapter_idx: chapterIdx,
        start_s: contentItem.startTime,
        end_s: contentItem.endTime,
        text: contentItem.text
      });
    });
  } else {
    // If no content, create placeholder segments for each chapter
    chapters.forEach(chapter => {
      segments.push({
        chapter_idx: chapter.idx,
        start_s: chapter.start_s,
        end_s: chapter.end_s,
        text: `Content for ${chapter.title}`
      });
    });
  }

  // Sort segments by start time
  segments.sort((a, b) => a.start_s - b.start_s);

  const canonicalTranscript: CanonicalTranscript = {
    source,
    chapters,
    segments,
    paragraphs: segments // Use segments as paragraphs for now
  };

  console.log(`[ConvexAdapter] Converted to ${chapters.length} chapters, ${segments.length} segments`);
  
  return canonicalTranscript;
}

/**
 * Validate that a Convex audiobook has the minimum required data for conversion
 */
export function validateConvexAudiobook(convexBook: ConvexAudiobook): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!convexBook.title) {
    errors.push('title is required');
  }

  if (!convexBook.author) {
    errors.push('author is required');
  }

  if (!convexBook.duration || convexBook.duration <= 0) {
    errors.push('duration must be a positive number');
  }

  if (!convexBook.chapters || convexBook.chapters.length === 0) {
    errors.push('at least one chapter is required');
  }

  // Validate chapters structure
  if (convexBook.chapters) {
    convexBook.chapters.forEach((chapter, index) => {
      if (!chapter.title) {
        errors.push(`chapter ${index + 1} is missing title`);
      }
      if (typeof chapter.start_s !== 'number' || chapter.start_s < 0) {
        errors.push(`chapter ${index + 1} has invalid start_s`);
      }
      if (typeof chapter.end_s !== 'number' || chapter.end_s <= chapter.start_s) {
        errors.push(`chapter ${index + 1} has invalid end_s`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
