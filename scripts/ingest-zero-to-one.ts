#!/usr/bin/env node

import { Innertube } from 'youtubei.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { CanonicalTranscript, Chapter, Segment } from '../agents/langgraph/types';

const ZERO_TO_ONE_URL = 'https://www.youtube.com/watch?v=dz_4Mjyqbqk';
const VIDEO_ID = 'dz_4Mjyqbqk';

// Chapter definitions based on typical Zero to One structure
const CHAPTERS: Chapter[] = [
  { idx: 0, title: "Introduction: The Challenge of the Future", start_s: 0, end_s: 600 },
  { idx: 1, title: "Chapter 1: Zero to One", start_s: 600, end_s: 1500 },
  { idx: 2, title: "Chapter 2: Party Like It's 1999", start_s: 1500, end_s: 2400 },
  { idx: 3, title: "Chapter 3: All Happy Companies Are Different", start_s: 2400, end_s: 3300 },
  { idx: 4, title: "Chapter 4: The Ideology of Competition", start_s: 3300, end_s: 4200 },
  { idx: 5, title: "Chapter 5: Last Mover Advantage", start_s: 4200, end_s: 5100 },
  { idx: 6, title: "Chapter 6: You Are Not a Lottery Ticket", start_s: 5100, end_s: 6000 },
  { idx: 7, title: "Chapter 7: Follow the Money", start_s: 6000, end_s: 6900 },
  { idx: 8, title: "Chapter 8: Secrets", start_s: 6900, end_s: 7800 },
  { idx: 9, title: "Chapter 9: Foundations", start_s: 7800, end_s: 8700 },
  { idx: 10, title: "Chapter 10: The Mechanics of Mafia", start_s: 8700, end_s: 9600 },
  { idx: 11, title: "Chapter 11: If You Build It, Will They Come?", start_s: 9600, end_s: 10500 },
  { idx: 12, title: "Chapter 12: Man and Machine", start_s: 10500, end_s: 11400 },
  { idx: 13, title: "Chapter 13: Seeing Green", start_s: 11400, end_s: 12300 },
  { idx: 14, title: "Chapter 14: The Founder's Paradox", start_s: 12300, end_s: 13200 },
  { idx: 15, title: "Conclusion: Stagnation or Singularity?", start_s: 13200, end_s: 14000 }
];

async function fetchTranscript(): Promise<any[]> {
  try {
    console.log('Fetching transcript from YouTube...');
    
    // Initialize YouTube client
    const youtube = await Innertube.create();
    
    // Get video info
    const info = await youtube.getInfo(VIDEO_ID);
    console.log('Video Title:', info.basic_info.title);
    console.log('Duration:', info.basic_info.duration, 'seconds');
    
    // Get transcript
    const transcriptData = await info.getTranscript();
    
    if (!transcriptData || !transcriptData.transcript) {
      throw new Error('No transcript available for this video');
    }
    
    const segments = transcriptData.transcript.content?.body?.initial_segments || [];
    console.log(`Fetched ${segments.length} transcript segments`);
    
    return segments;
  } catch (error) {
    console.error('Error fetching transcript:', error);
    throw error;
  }
}

function processTranscript(rawTranscript: any[]): { segments: Segment[], duration: number } {
  const segments: Segment[] = [];
  let maxEndTime = 0;
  
  for (const item of rawTranscript) {
    const start_s = Math.floor(item.offset / 1000); // Convert ms to seconds
    const duration_s = Math.floor(item.duration / 1000);
    const end_s = start_s + duration_s;
    
    // Find which chapter this segment belongs to
    let chapterIdx = 0;
    for (let i = CHAPTERS.length - 1; i >= 0; i--) {
      if (start_s >= CHAPTERS[i].start_s) {
        chapterIdx = i;
        break;
      }
    }
    
    segments.push({
      chapter_idx: chapterIdx,
      start_s,
      end_s,
      text: item.text.trim()
    });
    
    maxEndTime = Math.max(maxEndTime, end_s);
  }
  
  return { segments, duration: maxEndTime };
}

function createParagraphs(segments: Segment[]): Segment[] {
  const paragraphs: Segment[] = [];
  let currentParagraph: Segment | null = null;
  let sentenceCount = 0;
  
  for (const segment of segments) {
    const sentences = segment.text.split(/[.!?]+/).filter(s => s.trim());
    
    for (const sentence of sentences) {
      if (!currentParagraph) {
        currentParagraph = {
          chapter_idx: segment.chapter_idx,
          start_s: segment.start_s,
          end_s: segment.end_s,
          text: sentence.trim() + '.'
        };
        sentenceCount = 1;
      } else {
        currentParagraph.text += ' ' + sentence.trim() + '.';
        currentParagraph.end_s = segment.end_s;
        sentenceCount++;
      }
      
      // Create paragraph after 3-5 sentences
      if (sentenceCount >= 3 && (sentenceCount >= 5 || Math.random() > 0.5)) {
        paragraphs.push(currentParagraph);
        currentParagraph = null;
        sentenceCount = 0;
      }
    }
  }
  
  // Add remaining paragraph
  if (currentParagraph) {
    paragraphs.push(currentParagraph);
  }
  
  return paragraphs;
}

async function main() {
  try {
    console.log('Starting Zero to One ingestion...');
    console.log('URL:', ZERO_TO_ONE_URL);
    
    // Fetch transcript
    const rawTranscript = await fetchTranscript();
    
    // Process transcript into segments
    const { segments, duration } = processTranscript(rawTranscript);
    console.log(`Processed ${segments.length} segments`);
    
    // Create paragraphs
    const paragraphs = createParagraphs(segments);
    console.log(`Created ${paragraphs.length} paragraphs`);
    
    // Update chapter end times based on actual content
    const updatedChapters = CHAPTERS.map((chapter, idx) => {
      if (idx === CHAPTERS.length - 1) {
        return { ...chapter, end_s: duration };
      }
      return chapter;
    });
    
    // Create canonical transcript
    const canonicalTranscript: CanonicalTranscript = {
      source: {
        platform: 'youtube',
        video_id: VIDEO_ID,
        title: 'Zero to One - Peter Thiel (Full Audiobook)',
        channel: 'Audiobook Channel',
        duration_s: duration,
        rights: 'educational',
        language: 'en',
        captions_kind: 'auto',
        asr_provider: 'youtube',
        asr_model: 'youtube-auto'
      },
      chapters: updatedChapters,
      segments,
      paragraphs
    };
    
    // Create data directory
    const dataDir = join(process.cwd(), 'data');
    mkdirSync(dataDir, { recursive: true });
    
    // Save to file
    const outputPath = join(dataDir, 'zero-to-one.json');
    writeFileSync(outputPath, JSON.stringify(canonicalTranscript, null, 2));
    
    console.log(`\n✅ Successfully ingested Zero to One!`);
    console.log(`📁 Saved to: ${outputPath}`);
    console.log(`\nStats:`);
    console.log(`  - Chapters: ${updatedChapters.length}`);
    console.log(`  - Segments: ${segments.length}`);
    console.log(`  - Paragraphs: ${paragraphs.length}`);
    console.log(`  - Duration: ${Math.floor(duration / 60)} minutes`);
    
  } catch (error) {
    console.error('Ingestion failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as ingestZeroToOne };