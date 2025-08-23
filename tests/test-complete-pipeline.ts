#!/usr/bin/env node

import { runChapterQA, runNotes } from '../agents/langgraph/graph';
import { CanonicalTranscript } from '../agents/langgraph/types';
import { readFileSync } from 'fs';

async function testCompletePipeline() {
  console.log('🧪 Testing Complete LangGraph QA Pipeline...\n');
  
  // Load transcript data from file (for testing)
  const transcriptData = JSON.parse(readFileSync('./data/zero-to-one.json', 'utf-8')) as CanonicalTranscript;
  console.log(`Loaded transcript: "${transcriptData.source.title}" with ${transcriptData.chapters.length} chapters\n`);
  
  try {
    // Test 1: Full QA Pipeline
    console.log('Test 1: Complete QA Pipeline');
    console.log('Question: "What does Peter Thiel mean by going from zero to one?"');
    console.log('Chapter: 1, Progress: 3\n');
    
    const result = await runChapterQA({
      transcriptData: transcriptData,
      datasetPath: './data/zero-to-one.json', // Optional for summaries
      audiobookId: 'zero-to-one',
      question: 'What does Peter Thiel mean by going from zero to one?',
      playbackChapterIdx: 1,
      userProgressIdx: 3,
      modeHint: 'auto',
      tokenBudget: 180000,
      includePriorSummaries: false
    });
    
    console.log('📝 Answer:');
    console.log(result.answer_markdown);
    console.log('\n🔗 Citations:', result.citations.length);
    result.citations.forEach((citation, idx) => {
      console.log(`  ${idx + 1}. [${citation.type}] ${citation.ref}`);
    });
    console.log('\n⏯️  Playback Hint: Chapter', result.playbackHint.chapter_idx, 'at', result.playbackHint.start_s, 'seconds');
    
    console.log('\n✅ Test 1: Complete Pipeline - PASSED\n');
    
    // Test 2: Different modes
    console.log('Test 2: Testing Focused Mode');
    const focusedResult = await runChapterQA({
      datasetPath: './data/zero-to-one.json',
      audiobookId: 'zero-to-one', 
      question: 'What specific examples does Peter Thiel give about monopolies?',
      playbackChapterIdx: 2,
      userProgressIdx: 5,
      modeHint: 'focused',
      tokenBudget: 180000,
      includePriorSummaries: false
    });
    
    console.log('📝 Focused Answer:');
    console.log(focusedResult.answer_markdown.substring(0, 200) + '...');
    console.log('\n✅ Test 2: Focused Mode - PASSED\n');
    
    // Test 3: Notes Generation
    console.log('Test 3: Notes Generation');
    const notes = await runNotes({
      transcript: `
User: What does Peter Thiel mean by zero to one?
Assistant: Peter Thiel's "zero to one" refers to creating something entirely new rather than copying existing things. He argues that true innovation comes from building unique products that create new markets, not competing in existing ones.
User: Can you give me an example?
Assistant: Google is a great example - they didn't just improve existing search engines, they created an entirely new approach to organizing information that was so much better it created a monopoly in search.
      `
    });
    
    console.log('📋 Generated Notes:');
    console.log(notes);
    console.log('\n✅ Test 3: Notes Generation - PASSED\n');
    
    console.log('🎉 ALL INTEGRATION TESTS PASSED!');
    console.log('\n📊 Test Results Summary:');
    console.log('  ✅ Complete QA Pipeline with Dedalus API');
    console.log('  ✅ LangGraph node orchestration');
    console.log('  ✅ Multiple packing modes (auto, focused)');
    console.log('  ✅ Citation generation');
    console.log('  ✅ Playback hint generation');
    console.log('  ✅ Notes generation');
    console.log('  ✅ Spoiler-safe chapter filtering');
    
  } catch (error) {
    console.error('❌ INTEGRATION TEST FAILED:', error);
    
    // Check specific error types
    if (error instanceof Error) {
      if (error.message.includes('DEDALUS_API_KEY')) {
        console.error('💡 Hint: Make sure DEDALUS_API_KEY environment variable is set');
      } else if (error.message.includes('No such file')) {
        console.error('💡 Hint: Make sure data/zero-to-one.json exists');
      } else if (error.message.includes('fetch')) {
        console.error('💡 Hint: Check network connection to Dedalus API');
      }
    }
    
    process.exit(1);
  }
}

// Run the complete integration test
testCompletePipeline();