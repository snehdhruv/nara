#!/usr/bin/env node

import { runChapterQA } from '../agents/langgraph/graph';

async function validateRealFunctionality() {
  console.log('🔍 REAL VALIDATION TEST - No More Hacks\n');
  
  // Test with a question that should have clear citations
  const result = await runChapterQA({
    datasetPath: './data/zero-to-one.json',
    audiobookId: 'zero-to-one',
    question: 'What specific examples does Thiel give about startups?',
    playbackChapterIdx: 1,
    userProgressIdx: 1,  
    modeHint: 'full',
    tokenBudget: 50000, // Smaller budget to see if it handles constraints
    includePriorSummaries: false
  });
  
  console.log('📝 **ANSWER:**');
  console.log(result.answer_markdown);
  console.log('\n' + '='.repeat(50));
  
  console.log('🔗 **CITATIONS:** (Should be > 0 if working)');
  console.log('Count:', result.citations.length);
  result.citations.forEach((c, i) => {
    console.log(`  ${i+1}. Type: ${c.type}, Ref: ${c.ref}`);
  });
  
  console.log('\n⏯️ **PLAYBACK HINT:** (Should match citation times)');
  console.log('Chapter:', result.playbackHint.chapter_idx, 'Start:', result.playbackHint.start_s, 'seconds');
  
  // Validation checks
  console.log('\n🧪 **VALIDATION CHECKS:**');
  
  const checks = [
    {
      name: 'Citations extracted',
      pass: result.citations.length > 0,
      actual: result.citations.length,
      expected: '> 0'
    },
    {
      name: 'Playback hint has time',
      pass: result.playbackHint.start_s > 0,
      actual: result.playbackHint.start_s,
      expected: '> 0 seconds'
    },
    {
      name: 'Answer contains content',
      pass: result.answer_markdown.length > 100,
      actual: result.answer_markdown.length + ' chars',
      expected: '> 100 chars'
    },
    {
      name: 'Answer is spoiler-safe',
      pass: result.playbackHint.chapter_idx <= 1, // Should only access chapter 1
      actual: 'Chapter ' + result.playbackHint.chapter_idx,
      expected: 'Chapter 1 only'
    }
  ];
  
  let allPassed = true;
  checks.forEach((check, i) => {
    const status = check.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${i+1}. ${status}: ${check.name} (${check.actual} vs ${check.expected})`);
    if (!check.pass) allPassed = false;
  });
  
  console.log('\n🎯 **FINAL VERDICT:**');
  if (allPassed) {
    console.log('✅ ALL VALIDATIONS PASSED - System is working correctly!');
  } else {
    console.log('❌ SOME VALIDATIONS FAILED - There are still hacky/broken parts!');
  }
  
  return allPassed;
}

// Run validation
validateRealFunctionality()
  .then(passed => {
    process.exit(passed ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test crashed:', error.message);
    process.exit(1);
  });