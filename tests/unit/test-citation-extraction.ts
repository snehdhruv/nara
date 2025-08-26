#!/usr/bin/env node

import { runChapterQA } from '../agents/langgraph/graph';

async function testCitationExtraction() {
  console.log('🧪 Testing Citation Extraction...\\n');
  
  // Test with questions that might produce different types of citations
  const questions = [
    'What is the main message about technology in this chapter?',
    'What specific examples does Thiel give about startups?',
    'How does the author define progress?'
  ];
  
  for (const question of questions) {
    console.log(`\\n🔸 Testing: "${question}"`);
    
    try {
      const result = await runChapterQA({
        datasetPath: './data/zero-to-one.json',
        audiobookId: 'zero-to-one',
        question,
        playbackChapterIdx: 1,
        userProgressIdx: 1,  
        modeHint: 'full',
        tokenBudget: 30000,
        includePriorSummaries: false
      });
      
      console.log('Answer:', result.answer_markdown.substring(0, 200) + '...');
      console.log('Citations:', result.citations.length);
      if (result.citations.length > 0) {
        result.citations.forEach(c => console.log(`  - ${c.type}: ${c.ref}`));
      }
      console.log('Playback hint:', result.playbackHint);
      
    } catch (error) {
      console.error('❌ Failed:', error.message);
    }
  }
}

testCitationExtraction();