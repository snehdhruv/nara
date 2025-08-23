#!/usr/bin/env node

import { Innertube } from 'youtubei.js';

const VIDEO_ID = 'dz_4Mjyqbqk';
const VIDEO_URL = 'https://www.youtube.com/watch?v=dz_4Mjyqbqk';

async function testYouTubeFetch() {
  try {
    console.log('Testing YouTube fetch for Zero to One...');
    console.log('Video ID:', VIDEO_ID);
    
    // Initialize YouTube client
    const youtube = await Innertube.create();
    
    // Get video info
    console.log('\nFetching video info...');
    const info = await youtube.getInfo(VIDEO_ID);
    
    console.log('Title:', info.basic_info.title);
    console.log('Duration:', info.basic_info.duration, 'seconds');
    console.log('Author:', info.basic_info.author);
    
    // Try to get transcript
    console.log('\nFetching transcript...');
    const transcriptData = await info.getTranscript();
    
    if (transcriptData && transcriptData.transcript) {
      const segments = transcriptData.transcript.content?.body?.initial_segments || [];
      console.log('Found', segments.length, 'transcript segments');
      
      // Show first few segments
      if (segments.length > 0) {
        console.log('\nFirst 3 segments:');
        segments.slice(0, 3).forEach((seg: any, idx: number) => {
          console.log(`${idx + 1}. [${seg.start_ms}ms]: ${seg.snippet?.text || 'No text'}`);
        });
      }
    } else {
      console.log('No transcript available');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testYouTubeFetch();