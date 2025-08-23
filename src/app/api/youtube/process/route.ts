import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { videoId, title, channel } = await request.json();
    
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'Video ID is required' },
        { status: 400 }
      );
    }

    console.log('[YouTube Process API] Processing video:', videoId);

    // Use the ingest-youtube tool to process the video
    const ingestYouTubePath = path.join(process.cwd(), 'tools/ingest-youtube');
    let outputPath = path.join(ingestYouTubePath, 'out');
    
    // Ensure output directory exists
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    console.log('[YouTube Process API] Running ingest-youtube tool...');
    
    // Run the ingest-youtube tool
    try {
      const { stdout, stderr } = await execAsync(
        `cd "${ingestYouTubePath}" && npm run dev fetch -- --url "https://www.youtube.com/watch?v=${videoId}" --lang en --fallback-auto --out ./out`,
        { 
          timeout: 600000, // 10 minute timeout
          env: { 
            ...process.env, 
            OPENAI_API_KEY: process.env.OPENAI_API_KEY 
          }
        }
      );
      
      console.log('[YouTube Process API] ingest-youtube stdout:', stdout);
      if (stderr) console.log('[YouTube Process API] ingest-youtube stderr:', stderr);
      
    } catch (execError) {
      console.error('[YouTube Process API] ingest-youtube execution error:', execError);
      
      // Fall back to ASR tool if ingest-youtube fails
      console.log('[YouTube Process API] Falling back to ASR tool...');
      
      const asrYouTubePath = path.join(process.cwd(), 'tools/asr-youtube');
      const asrOutputPath = path.join(asrYouTubePath, 'out');
      
      if (!fs.existsSync(asrOutputPath)) {
        fs.mkdirSync(asrOutputPath, { recursive: true });
      }
      
      try {
        const { stdout: asrStdout, stderr: asrStderr } = await execAsync(
          `cd "${asrYouTubePath}" && npm run transcribe -- --url "https://www.youtube.com/watch?v=${videoId}" --lang en --out ./out`,
          { 
            timeout: 600000, // 10 minute timeout for ASR
            env: { 
              ...process.env, 
              OPENAI_API_KEY: process.env.OPENAI_API_KEY 
            }
          }
        );
        
        console.log('[YouTube Process API] ASR stdout:', asrStdout);
        if (asrStderr) console.log('[YouTube Process API] ASR stderr:', asrStderr);
        
        // Update output path to ASR output
        outputPath = asrOutputPath;
        
      } catch (asrError) {
        console.error('[YouTube Process API] ASR tool also failed:', asrError);
        throw new Error('Both ingest-youtube and ASR tools failed');
      }
    }

    // Read the generated JSON file
    const outputFile = path.join(outputPath, `${videoId}.json`);
    
    if (!fs.existsSync(outputFile)) {
      throw new Error(`Output file not found: ${outputFile}`);
    }

    const rawData = fs.readFileSync(outputFile, 'utf8');
    const processedData = JSON.parse(rawData);
    
    // Transform the tool output format to our audiobook format
    const audioBookData = {
      id: videoId,
      youtubeVideoId: videoId,
      title: title || processedData.source.title,
      author: channel || processedData.source.channel,
      duration: processedData.source.duration_s,
      coverUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      narrator: channel || processedData.source.channel,
      currentChapter: 1,
      chapterTitle: processedData.chapters?.[0]?.title || 'Chapter 1',
      
      // Use real chapters from the tool
      chapters: processedData.chapters?.map((ch: { idx: any; title: any; start_s: any; end_s: any; }) => ({
        idx: ch.idx,
        title: ch.title,
        start_s: ch.start_s,
        end_s: ch.end_s
      })) || [],
      
      // Use real paragraphs as content (transform format)
      content: processedData.paragraphs?.slice(0, 100).map((para: { text: any; start_s: any; end_s: any; }) => ({
        text: para.text,
        startTime: para.start_s,
        endTime: para.end_s
      })) || []
    };

    console.log('[YouTube Process API] Successfully processed video:', videoId);
    
    // Save the processed audiobook to Convex
    const { ConvexHttpClient } = require("convex/browser");
    const { api } = require("../../../../../convex/_generated/api");
    
    try {
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
      
      // Check if audiobook already exists
      const existingBook = await convex.query(api.audiobooks.getAudiobookByYouTubeId, {
        youtubeVideoId: videoId
      });
      
      if (existingBook) {
        console.log('[YouTube Process API] Audiobook already exists in Convex:', existingBook._id);
      } else {
        // Create new audiobook in Convex
        const audiobookId = await convex.mutation(api.audiobooks.createAudiobook, {
          title: audioBookData.title,
          author: audioBookData.author,
          narrator: audioBookData.narrator,
          coverUrl: audioBookData.coverUrl,
          duration: audioBookData.duration,
          description: audioBookData.description || `${audioBookData.title} by ${audioBookData.author}`,
          youtubeVideoId: videoId,
          totalChapters: audioBookData.chapters.length,
          isYouTube: true,
          chapters: audioBookData.chapters,
          content: audioBookData.content
        });
        
        console.log('[YouTube Process API] Saved audiobook to Convex with ID:', audiobookId);
        audioBookData.id = audiobookId;
      }
    } catch (convexError) {
      console.error('[YouTube Process API] Failed to save to Convex:', convexError);
      // Continue anyway - the processing was successful
    }

    return NextResponse.json({
      success: true,
      audiobook: audioBookData
    });

  } catch (error) {
    console.error('[YouTube Process API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process video: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}