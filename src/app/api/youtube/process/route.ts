import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { ingestVideo } from '../../../../lib/tools/ingest-youtube/src/index';
import { transcribeYouTubeVideo } from '../../../../lib/tools/asr-youtube/src/index';
import { generateCoverUrl } from '../../../../lib/utils/cover-generator';

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

    // Set up output directory
    const outputPath = path.join(process.cwd(), 'src/lib/tools/ingest-youtube/out');
    
    // Ensure output directory exists
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    console.log('[YouTube Process API] Running ingest-youtube tool...');
    
    let processedData;
    
    // Try using the ingest-youtube tool first
    try {
      const result = await ingestVideo({
        urlOrId: videoId,
        lang: 'en',
        fallbackAuto: true,
        outputDir: outputPath
      });
      
      processedData = result;
      console.log('[YouTube Process API] Successfully processed with ingest-youtube');
      
    } catch (ingestError) {
      console.error('[YouTube Process API] ingest-youtube failed:', ingestError);
      
      // Fall back to ASR tool if ingest-youtube fails
      console.log('[YouTube Process API] Falling back to ASR tool...');
      
      const asrOutputPath = path.join(process.cwd(), 'src/lib/tools/asr-youtube/out');
      
      if (!fs.existsSync(asrOutputPath)) {
        fs.mkdirSync(asrOutputPath, { recursive: true });
      }
      
      try {
        const asrResult = await transcribeYouTubeVideo({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          lang: 'en',
          out: asrOutputPath
        });
        
        console.log('[YouTube Process API] Successfully processed with ASR tool');
        
        // Read the generated JSON file from ASR
        const asrOutputFile = path.join(asrOutputPath, `${videoId}.json`);
        
        if (!fs.existsSync(asrOutputFile)) {
          throw new Error(`ASR output file not found: ${asrOutputFile}`);
        }

        const rawAsrData = fs.readFileSync(asrOutputFile, 'utf8');
        processedData = JSON.parse(rawAsrData);
        
      } catch (asrError) {
        console.error('[YouTube Process API] ASR tool also failed:', asrError);
        throw new Error('Both ingest-youtube and ASR tools failed: ' + (asrError instanceof Error ? asrError.message : 'Unknown error'));
      }
    }
    
    // Transform the tool output format to our audiobook format
    let audioBookData;
    
    if (processedData.source) {
      // This is from ingest-youtube tool
      const bookTitle = title || processedData.source.title;
      const bookAuthor = channel || processedData.source.channel;
      
      // Generate a proper cover URL using the cover generator
      const coverUrl = await generateCoverUrl({
        title: bookTitle,
        author: bookAuthor,
        youtubeVideoId: videoId
      });
      
      audioBookData = {
        id: videoId,
        youtubeVideoId: videoId,
        title: bookTitle,
        author: bookAuthor,
        duration: processedData.source.duration_s,
        coverUrl,
        narrator: bookAuthor,
        currentChapter: 1,
        chapterTitle: processedData.chapters?.[0]?.title || 'Chapter 1',
        description: `${processedData.source.title} by ${processedData.source.channel}`,
        
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
    } else {
      // This is from ASR tool (has videoMeta instead of source)
      const bookTitle = title || processedData.videoMeta?.title;
      const bookAuthor = channel || processedData.videoMeta?.channel;
      
      // Generate a proper cover URL using the cover generator
      const coverUrl = await generateCoverUrl({
        title: bookTitle,
        author: bookAuthor,
        youtubeVideoId: videoId
      });
      
      audioBookData = {
        id: videoId,
        youtubeVideoId: videoId,
        title: bookTitle,
        author: bookAuthor,
        duration: processedData.videoMeta?.duration_s,
        coverUrl,
        narrator: bookAuthor,
        currentChapter: 1,
        chapterTitle: processedData.chapters?.[0]?.title || 'Chapter 1',
        description: `${processedData.videoMeta?.title} by ${processedData.videoMeta?.channel}`,
        
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
    }

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