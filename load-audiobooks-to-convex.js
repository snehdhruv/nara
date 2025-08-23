#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Audiobook files to process (excluding rickroll)
const audiobooks = [
  {
    file: 'tools/ingest-youtube/out/dz_4Mjyqbqk.json',
    videoId: 'dz_4Mjyqbqk',
    title: 'Zero to One',
    author: 'Peter Thiel',
    narrator: 'Blake Masters'
  },
  {
    file: 'tools/ingest-youtube/out/UF8uR6Z6KLc.json',
    videoId: 'UF8uR6Z6KLc',
    title: 'Steve Jobs Stanford Commencement',
    author: 'Steve Jobs',
    narrator: 'Steve Jobs'
  },
  {
    file: 'tools/ingest-youtube/out/Th8JoIan4dg.json',
    videoId: 'Th8JoIan4dg', 
    title: 'How to Get Startup Ideas',
    author: 'Y Combinator',
    narrator: 'Y Combinator'
  }
];

async function loadAudiobooksToConvex() {
  console.log('🚀 Loading processed audiobooks to Convex...\n');
  
  for (const book of audiobooks) {
    console.log(`📖 Processing: ${book.title}`);
    
    try {
      // Check if file exists
      if (!fs.existsSync(book.file)) {
        console.log(`   ❌ File not found: ${book.file}`);
        continue;
      }
      
      // Load the JSON data
      const rawData = fs.readFileSync(book.file, 'utf8');
      const data = JSON.parse(rawData);
      
      console.log(`   📊 Source: ${data.source.channel} (${Math.round(data.source.duration_s / 60)}min)`);
      console.log(`   📑 Chapters: ${data.chapters?.length || 0}`);
      console.log(`   📝 Paragraphs: ${data.paragraphs?.length || 0}`);
      
      // Transform to our format
      const audiobookData = {
        videoId: book.videoId,
        title: book.title,
        author: book.author,
        narrator: book.narrator,
        coverUrl: `https://i.ytimg.com/vi/${book.videoId}/maxresdefault.jpg`,
        duration: data.source.duration_s,
        description: `${book.title} by ${book.author}`,
        
        // Use chapters from the processed data
        chapters: data.chapters?.map(ch => ({
          idx: ch.idx,
          title: ch.title,
          start_s: ch.start_s,
          end_s: ch.end_s
        })) || [],
        
        // Use paragraphs as content for transcript display
        content: data.paragraphs?.map(para => ({
          text: para.text,
          startTime: para.start_s,
          endTime: para.end_s
        })) || []
      };
      
      // Call the API to save to Convex
      console.log(`   🔄 Saving to Convex...`);
      const response = await fetch('http://localhost:3000/api/youtube/save-to-convex', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(audiobookData),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`   ✅ Successfully saved: ${book.title}`);
        console.log(`   🆔 Convex ID: ${result.audiobookId}`);
      } else {
        console.log(`   ❌ Failed to save: ${result.error}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error processing ${book.title}: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('✅ Audiobook loading complete!');
  console.log('🔗 Visit http://localhost:3000/nara to see the updated library');
}

loadAudiobooksToConvex().catch(console.error);