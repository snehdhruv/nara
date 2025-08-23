#!/usr/bin/env node

import { runChapterQA } from '../agents/langgraph/graph';

async function testChapterFix() {
  console.log('Testing Chapter Loading Fix...\n');
  
  try {
    // Test with chapter 1 (should exist and have segments)
    const result = await runChapterQA({
      datasetPath: '/Users/snehdhruv/Documents/hackathons/dedalus/data/zero-to-one.json',
      audiobookId: 'zero-to-one',
      question: 'What is the main challenge of the future according to Peter Thiel?',
      playbackChapterIdx: 1,
      userProgressIdx: 1,  
      modeHint: 'full',
      tokenBudget: 180000,
      includePriorSummaries: false
    });
    
    console.log('✅ Chapter 1 loaded successfully');
    console.log('Answer length:', result.answer_markdown.length, 'characters');
    console.log('Citations count:', result.citations.length);
    console.log('Playback hint:', result.playbackHint);
    
    if (result.answer_markdown.length < 50) {
      throw new Error('Answer too short - likely no content loaded');
    }
    
  } catch (error) {
    console.error('❌ Chapter loading test failed:', error);
    throw error;
  }
}

testChapterFix();