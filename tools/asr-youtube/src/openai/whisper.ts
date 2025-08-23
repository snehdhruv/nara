import OpenAI from 'openai';
import { createReadStream } from 'fs';
import { log, progress, error } from '../util/log.js';
import { roundToDecimals } from '../util/time.js';

export interface TranscriptionSegment {
  start_s: number;
  end_s: number;
  text: string;
}

interface TranscribeOptions {
  path: string;
  lang?: string;
  model?: string;
}

// Lazy load OpenAI client to ensure env is loaded
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: parseInt(process.env.OPENAI_TIMEOUT_MS || '120000')
    });
  }
  return openaiClient;
}

export async function transcribeAudio({ path, lang = 'en', model = 'whisper-1' }: TranscribeOptions): Promise<TranscriptionSegment[]> {
  progress(`Starting Whisper transcription with model: ${model}`);
  
  try {
    const audioFile = createReadStream(path);
    
    const openai = getOpenAI();
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: model,
      language: lang,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment']
    });
    
    log(`Transcription completed. Processing ${response.segments?.length || 0} segments`);
    
    if (!response.segments) {
      throw new Error('No segments returned from Whisper API');
    }
    
    // Convert OpenAI segments to our format
    const segments: TranscriptionSegment[] = response.segments.map(segment => ({
      start_s: roundToDecimals(segment.start),
      end_s: roundToDecimals(segment.end),
      text: segment.text.trim()
    }));
    
    // Split long segments by punctuation while preserving timestamps
    const refinedSegments = splitLongSegments(segments);
    
    log(`Generated ${refinedSegments.length} refined segments`);
    return refinedSegments;
    
  } catch (err: any) {
    error(`Whisper transcription failed: ${err.message}`);
    throw new Error(`OpenAI Whisper transcription failed: ${err.message}`);
  }
}

function splitLongSegments(segments: TranscriptionSegment[]): TranscriptionSegment[] {
  const refined: TranscriptionSegment[] = [];
  
  for (const segment of segments) {
    const sentences = segment.text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
    
    if (sentences.length <= 1) {
      refined.push(segment);
      continue;
    }
    
    // Distribute time proportionally across sentences
    const duration = segment.end_s - segment.start_s;
    const totalChars = segment.text.length;
    let currentTime = segment.start_s;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceDuration = (sentence.length / totalChars) * duration;
      const endTime = i === sentences.length - 1 ? segment.end_s : currentTime + sentenceDuration;
      
      refined.push({
        start_s: roundToDecimals(currentTime),
        end_s: roundToDecimals(endTime),
        text: sentence.trim()
      });
      
      currentTime = endTime;
    }
  }
  
  return refined;
}