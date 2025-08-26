#!/usr/bin/env node

// Batch process all audiobooks in parallel
const audiobooks = [
  {"id": "js7b1f32pk1ft6fserfe5k10fh7p7hxf", "youtubeVideoId": "XQ8a8NmDrFg", "title": "The Lean Startup by Eric Ries (Audiobook)"},
  {"id": "js701ma55ndt5qr4ak84jrd6357p6hqb", "youtubeVideoId": "UF8uR6Z6KLc", "title": "Steve Jobs Stanford Commencement"},
  {"id": "js7f4gmxp2j2d3q33bywc58gjn7p6tez", "youtubeVideoId": "Th8JoIan4dg", "title": "How to Get Startup Ideas"},
  {"id": "js7bqhcxaxg4v1wgjvj60a6gd97p62me", "youtubeVideoId": "dw9QCsu1oi0", "title": "Shrek 1 audiobook"},
  {"id": "js758awdaese2b2je1rmjvfzjh7p6c1g", "youtubeVideoId": "MxGn2MBVdJI", "title": "The Almanack of Naval Ravikant: A Guide to Wealth and Happiness"},
  {"id": "js79056h1ad6mt8qsybah5pghn7p76ex", "youtubeVideoId": "U3nT2KDAGOc", "title": "Good to Great by Jim Collins - Full Audiobook"},
  {"id": "js74crr5dt7g0tyfz91q9yg8q57p7svq", "youtubeVideoId": "W608u6sBFpo", "title": "Sam Altman: How to Build the Future"},
  {"id": "js77hx4r6cqm2x6bc0ffmbbd9x7p9qj9", "youtubeVideoId": "QWvBvDeB7aw", "title": "How to Talk to the Universe (Full Audiobook)"},
  {"id": "js7dj39kbc639h86hmrbanb7q17pdzmh", "youtubeVideoId": "U5dGgGFyMUc", "title": "I Read The Sexy Shrek Book... So You Don't Have To."},
  {"id": "js7d44bevt917wwh6sx5atpep97pdr6b", "youtubeVideoId": "c-JkrlVhs_0", "title": "From the 60 Minutes Archive: Steve Jobs"},
  {"id": "js79d9zz098p7q8brkb67ajkk97pc1xx", "youtubeVideoId": "4T_0Tcts6aM", "title": "Joe Rogan Experience #2187 - Adam Sandler"}
];

async function processAudiobook(book) {
  console.log(`🔄 Processing: ${book.title}`);
  
  try {
    const response = await fetch('http://localhost:3000/api/youtube/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: book.youtubeVideoId,
        title: book.title,
        channel: 'Various'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Successfully processed: ${book.title}`);
      return { book: book.title, success: true };
    } else {
      console.log(`❌ Failed to process: ${book.title} - ${result.error}`);
      return { book: book.title, success: false, error: result.error };
    }
  } catch (error) {
    console.log(`❌ Error processing ${book.title}: ${error.message}`);
    return { book: book.title, success: false, error: error.message };
  }
}

async function processAllAudiobooks() {
  console.log('🚀 Starting batch processing of audiobooks...\n');
  
  // Process all audiobooks in parallel
  const promises = audiobooks.map(book => processAudiobook(book));
  const results = await Promise.all(promises);
  
  console.log('\n=== Summary ===');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successfully processed: ${successful.length}`);
  successful.forEach(r => console.log(`   - ${r.book}`));
  
  if (failed.length > 0) {
    console.log(`❌ Failed to process: ${failed.length}`);
    failed.forEach(r => console.log(`   - ${r.book}: ${r.error}`));
  }
  
  console.log(`\nTotal: ${successful.length} success, ${failed.length} failures`);
}

processAllAudiobooks().catch(console.error);