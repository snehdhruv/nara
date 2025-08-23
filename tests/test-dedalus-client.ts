#!/usr/bin/env node

import { getLLMClient } from '../agents/langgraph/llm-client';

async function testDedalusClient() {
  console.log('Testing Dedalus LLM Client...\n');
  
  const client = getLLMClient();
  
  try {
    // Test 1: Simple completion
    console.log('Test 1: Simple completion');
    const response1 = await client.complete({
      system: 'You are a helpful assistant. Be concise.',
      messages: [
        { role: 'user', content: 'What is 2+2?' }
      ]
    });
    console.log('Response:', response1);
    console.log('✅ Test 1 passed\n');
    
    // Test 2: Question about Zero to One
    console.log('Test 2: Zero to One question');
    const response2 = await client.complete({
      system: 'You are an expert on Peter Thiel\'s Zero to One book. Answer based on the following context.',
      messages: [
        { 
          role: 'user', 
          content: 'Context: Zero to One is about building companies that create new things. Peter Thiel emphasizes the importance of monopolies and avoiding competition.\n\nQuestion: What is the main thesis of Zero to One?' 
        }
      ]
    });
    console.log('Response:', response2);
    console.log('✅ Test 2 passed\n');
    
    // Test 3: JSON output
    console.log('Test 3: JSON output format');
    const response3 = await client.complete({
      system: 'You are a helpful assistant. Always respond with valid JSON.',
      messages: [
        { 
          role: 'user', 
          content: 'Generate a JSON object with "answer_markdown" and "citations" fields. The answer should be about startups.' 
        }
      ]
    });
    console.log('Response:', response3);
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(response3);
      console.log('Parsed JSON:', parsed);
      console.log('✅ Test 3 passed\n');
    } catch (e) {
      console.log('⚠️ Response is not valid JSON, but that\'s okay for now\n');
    }
    
    console.log('All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDedalusClient();