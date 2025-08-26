#!/usr/bin/env node

import { runChapterQA } from '../agents/langgraph/graph';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { convertConvexToCanonical, validateConvexAudiobook } from '../agents/langgraph/utils/convexAdapter';

async function testConvexIntegration() {
  console.log('🧪 Testing LangGraph with Convex Audiobook Data...\n');
  
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  
  try {
    // Get all audiobooks from Convex
    console.log('📚 Fetching audiobooks from Convex...');
    const audiobooks = await convex.query(api.audiobooks.listAudiobooks, {});
    console.log(`Found ${audiobooks.length} audiobooks in Convex:`);
    
    audiobooks.forEach((book, idx) => {
      console.log(`  ${idx + 1}. "${book.title}" by ${book.author} (${book.youtubeVideoId || 'No YouTube ID'})`);
    });
    
    // Find a Steve Jobs audiobook or use the first available
    let testAudiobook = audiobooks.find(book => 
      book.title.toLowerCase().includes('steve') || 
      book.title.toLowerCase().includes('jobs') ||
      book.author.toLowerCase().includes('steve') ||
      book.author.toLowerCase().includes('jobs')
    );
    
    if (!testAudiobook) {
      console.log('\n📖 No Steve Jobs audiobook found, using first available audiobook...');
      testAudiobook = audiobooks[0];
    }
    
    if (!testAudiobook) {
      throw new Error('No audiobooks found in Convex');
    }
    
    console.log(`\n🎯 Testing with: "${testAudiobook.title}" by ${testAudiobook.author}`);
    console.log(`   Duration: ${Math.floor(testAudiobook.duration / 60)}:${(testAudiobook.duration % 60).toString().padStart(2, '0')}`);
    console.log(`   Chapters: ${testAudiobook.chapters?.length || 'Unknown'}`);
    console.log(`   Content segments: ${testAudiobook.content?.length || 'None'}`);
    
    // Validate the audiobook data
    console.log('\n🔍 Validating Convex audiobook data...');
    const validation = validateConvexAudiobook(testAudiobook);
    if (!validation.isValid) {
      console.error('❌ Validation failed:', validation.errors);
      throw new Error(`Invalid audiobook data: ${validation.errors.join(', ')}`);
    }
    console.log('✅ Audiobook data is valid');
    
    // Convert to CanonicalTranscript format
    console.log('\n🔄 Converting to CanonicalTranscript format...');
    const transcriptData = convertConvexToCanonical(testAudiobook);
    console.log(`✅ Converted: ${transcriptData.chapters.length} chapters, ${transcriptData.segments.length} segments`);
    
    // Test with a relevant question
    const question = testAudiobook.title.toLowerCase().includes('steve') || testAudiobook.title.toLowerCase().includes('jobs')
      ? 'What are the key lessons about innovation and leadership?'
      : 'What is the main concept or theme of this book?';
    
    console.log(`\n🤔 Testing LangGraph QA with question: "${question}"`);
    console.log('📊 Using chapter 1, user progress: 5');
    
    const startTime = Date.now();
    const result = await runChapterQA({
      transcriptData: transcriptData,
      audiobookId: testAudiobook._id,
      question: question,
      playbackChapterIdx: 1,
      userProgressIdx: 5, // Allow access to first 5 chapters
      modeHint: 'auto',
      tokenBudget: 100000, // Smaller budget for faster testing
      includePriorSummaries: false
    });
    const totalTime = Date.now() - startTime;
    
    console.log(`\n✅ LangGraph QA completed in ${totalTime}ms`);
    console.log('\n📝 Answer:');
    console.log('='.repeat(50));
    console.log(result.answer?.markdown || 'No answer generated');
    console.log('=' .repeat(50));
    
    console.log(`\n🔗 Citations: ${result.citations?.length || 0}`);
    if (result.citations && result.citations.length > 0) {
      result.citations.slice(0, 3).forEach((citation, idx) => {
        console.log(`  ${idx + 1}. [${citation.type}] ${citation.ref}`);
      });
      if (result.citations.length > 3) {
        console.log(`  ... and ${result.citations.length - 3} more`);
      }
    }
    
    if (result.playbackHint) {
      console.log(`\n⏭️  Playback hint: Chapter ${result.playbackHint.chapter_idx}, ${result.playbackHint.start_s}s`);
    }
    
    console.log('\n🎉 Convex integration test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Audiobook: "${testAudiobook.title}"`);
    console.log(`   • Data source: Convex database`);
    console.log(`   • Conversion: ✅ Success`);
    console.log(`   • LangGraph: ✅ Success`);
    console.log(`   • Total time: ${totalTime}ms`);
    
  } catch (error) {
    console.error('\n❌ CONVEX INTEGRATION TEST FAILED:', error);
    process.exit(1);
  }
}

// Set required environment variables if not set
if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  console.error('❌ NEXT_PUBLIC_CONVEX_URL environment variable is required');
  process.exit(1);
}

// Run the test
testConvexIntegration();
