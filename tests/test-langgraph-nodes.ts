#!/usr/bin/env node

import { GraphState } from '../agents/langgraph/types';
import { progressGateNode } from '../agents/langgraph/nodes/progressGate';
import { chapterLoaderNode } from '../agents/langgraph/nodes/chapterLoader';
import { budgetPlannerNode } from '../agents/langgraph/nodes/budgetPlanner';
import { contextPackerNode } from '../agents/langgraph/nodes/contextPacker';

async function testNodes() {
  console.log('Testing LangGraph Nodes...\n');
  
  // Initial state
  let state: GraphState = {
    datasetPath: './data/zero-to-one.json',
    audiobookId: 'zero-to-one',
    question: 'What does Peter Thiel mean by going from zero to one?',
    playbackChapterIdx: 1,
    userProgressIdx: 3,
    modeHint: 'auto',
    tokenBudget: 180000,
    includePriorSummaries: false
  };
  
  try {
    // Test 1: Progress Gate Node
    console.log('Test 1: Progress Gate Node');
    console.log('Input: playback=1, progress=3');
    const progressResult = await progressGateNode(state);
    state = { ...state, ...progressResult };
    console.log('Output: allowedIdx =', state.allowedIdx);
    console.log('✅ Test 1 passed\n');
    
    // Test 2: Chapter Loader Node
    console.log('Test 2: Chapter Loader Node');
    const chapterResult = await chapterLoaderNode(state);
    state = { ...state, ...chapterResult };
    console.log('Loaded chapter:', state.chapter?.idx, '-', state.chapter?.title);
    console.log('Number of segments:', state.chapter?.segments?.length);
    console.log('✅ Test 2 passed\n');
    
    // Test 3: Budget Planner Node
    console.log('Test 3: Budget Planner Node');
    const budgetResult = await budgetPlannerNode(state);
    state = { ...state, ...budgetResult };
    console.log('Selected packing mode:', state.packingMode);
    console.log('✅ Test 3 passed\n');
    
    // Test 4: Context Packer Node
    console.log('Test 4: Context Packer Node');
    const packerResult = await contextPackerNode(state);
    state = { ...state, ...packerResult };
    console.log('Packed messages:', Array.isArray(state.packedMessages) ? state.packedMessages.length : 'error');
    if (Array.isArray(state.packedMessages) && state.packedMessages.length > 0) {
      console.log('First message preview:', state.packedMessages[0].content.substring(0, 100) + '...');
    }
    console.log('✅ Test 4 passed\n');
    
    console.log('All node tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
testNodes();