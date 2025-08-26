#!/usr/bin/env node

import { Innertube } from 'youtubei.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { CanonicalTranscript, Chapter, Segment } from '../agents/langgraph/types';

const VIDEO_URL = 'https://www.youtube.com/watch?v=s9JhPGAf5lc';
const VIDEO_ID = 's9JhPGAf5lc';

async function fetchTranscript(): Promise<any[]> {
  try {
    console.log('Fetching transcript from YouTube...');
    
    const youtube = await Innertube.create();
    const info = await youtube.getInfo(VIDEO_ID);
    console.log('Video Title:', info.basic_info.title);
    console.log('Duration:', info.basic_info.duration, 'seconds');
    
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
    if (!item || !item.text) continue;
    
    const start_s = Math.floor(item.offset / 1000);
    const duration_s = Math.floor(item.duration / 1000);
    const end_s = start_s + duration_s;
    
    segments.push({
      chapter_idx: 0,
      start_s,
      end_s,
      text: item.text.trim()
    });
    
    maxEndTime = Math.max(maxEndTime, end_s);
  }
  
  return { segments, duration: maxEndTime };
}

async function main() {
  try {
    console.log('Starting Reid Hoffman Blitzscaling ingestion...');
    console.log('URL:', VIDEO_URL);
    
    const rawTranscript = await fetchTranscript();
    const { segments, duration } = processTranscript(rawTranscript);
    console.log(`Processed ${segments.length} segments`);
    
    const chapters = [{ idx: 1, title: "Full", start_s: 0, end_s: duration }];
    
    const canonicalTranscript: CanonicalTranscript = {
      source: {
        platform: 'youtube',
        video_id: VIDEO_ID,
        title: 'Reid Hoffman - Blitzscaling Lecture',
        channel: 'Greylock Partners',
        duration_s: duration,
        rights: 'educational',
        language: 'en',
        captions_kind: 'auto',
        asr_provider: 'youtube',
        asr_model: 'youtube-auto'
      },
      chapters,
      segments,
      paragraphs: segments
    };
    
    const dataDir = join(process.cwd(), 'data');
    mkdirSync(dataDir, { recursive: true });
    
    const outputPath = join(dataDir, 'reid-hoffman-blitzscaling.json');
    writeFileSync(outputPath, JSON.stringify(canonicalTranscript, null, 2));
    
    console.log(`\n✅ Successfully ingested Reid Hoffman Blitzscaling!`);
    console.log(`📁 Saved to: ${outputPath}`);
    console.log(`  - Duration: ${Math.floor(duration / 60)} minutes`);
    
  } catch (error) {
    console.error('Ingestion failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { main as ingestReidHoffmanBlitzscaling };