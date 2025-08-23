import protobuf from 'protobufjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { msToSeconds } from '../../util/time.js';
import { log, warn, error } from '../../util/log.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface TranscriptSegment {
  start_s: number;
  end_s: number;
  text: string;
  speaker?: string;
  confidence?: number;
}

let transcriptType: protobuf.Type | null = null;
let segmentType: protobuf.Type | null = null;

async function loadProtobufSchema(): Promise<void> {
  if (transcriptType) return; // Already loaded

  try {
    const protoPath = join(__dirname, 'schema.proto');
    const root = await protobuf.load(protoPath);
    
    transcriptType = root.lookupType('spotify.transcript.Transcript');
    segmentType = root.lookupType('spotify.transcript.Segment');
    
    log('Protobuf schema loaded successfully');
  } catch (err: any) {
    error(`Failed to load protobuf schema: ${err.message}`);
    throw err;
  }
}

export async function decodeTranscriptBuffer(buffer: Uint8Array): Promise<TranscriptSegment[]> {
  await loadProtobufSchema();
  
  if (!transcriptType || !segmentType) {
    throw new Error('Protobuf schema not loaded');
  }

  try {
    // Primary decode attempt with known schema
    const decoded = transcriptType.decode(buffer);
    const message = transcriptType.toObject(decoded, { defaults: true });
    
    return parseTranscriptMessage(message);
    
  } catch (primaryError: any) {
    warn(`Primary protobuf decode failed: ${primaryError.message}`);
    
    // Secondary decode attempt with alternative field mapping
    try {
      return await decodeWithAlternativeMapping(buffer);
    } catch (secondaryError: any) {
      warn(`Alternative decode failed: ${secondaryError.message}`);
      
      // Final attempt: raw field extraction
      try {
        return await decodeRawFields(buffer);
      } catch (rawError: any) {
        error(`All decode attempts failed: ${rawError.message}`);
        throw new Error(`Cannot decode transcript protobuf: ${primaryError.message}`);
      }
    }
  }
}

function parseTranscriptMessage(message: any): TranscriptSegment[] {
  if (!message.segments || !Array.isArray(message.segments)) {
    throw new Error('No segments found in transcript message');
  }

  return message.segments
    .filter((segment: any) => segment.text && segment.text.trim())
    .map((segment: any) => ({
      start_s: msToSeconds(segment.startMs || segment.start_ms || 0),
      end_s: msToSeconds(segment.endMs || segment.end_ms || segment.startMs || segment.start_ms || 0),
      text: (segment.text || '').trim(),
      speaker: segment.speaker || undefined,
      confidence: segment.confidence || undefined
    }))
    .filter((segment: any) => segment.text.length > 0);
}

async function decodeWithAlternativeMapping(buffer: Uint8Array): Promise<TranscriptSegment[]> {
  // Try alternative field numbering (e.g., 2,3,1 instead of 1,2,3)
  const altSchema = `
    syntax = "proto3";
    message AltTranscript {
      repeated AltSegment segments = 1;
    }
    message AltSegment {
      int32 end_ms = 1;
      string text = 2;
      int32 start_ms = 3;
      float confidence = 4;
      string speaker = 5;
    }
  `;

  try {
    const root = protobuf.parse(altSchema).root;
    const AltTranscript = root.lookupType('AltTranscript');
    
    const decoded = AltTranscript.decode(buffer);
    const message = AltTranscript.toObject(decoded, { defaults: true });
    
    if (!message.segments || !Array.isArray(message.segments)) {
      throw new Error('No segments in alternative decode');
    }

    return message.segments
      .filter((segment: any) => segment.text && segment.text.trim())
      .map((segment: any) => ({
        start_s: msToSeconds(segment.start_ms || 0),
        end_s: msToSeconds(segment.end_ms || segment.start_ms || 0),
        text: (segment.text || '').trim(),
        speaker: segment.speaker || undefined,
        confidence: segment.confidence || undefined
      }));
      
  } catch (err: any) {
    throw new Error(`Alternative decode failed: ${err.message}`);
  }
}

async function decodeRawFields(buffer: Uint8Array): Promise<TranscriptSegment[]> {
  // Last resort: try to extract raw field data by scanning for patterns
  try {
    const reader = protobuf.Reader.create(buffer);
    const segments: TranscriptSegment[] = [];
    
    while (reader.pos < reader.len) {
      const tag = reader.uint32();
      const wireType = tag & 7;
      const fieldNum = tag >>> 3;
      
      if (wireType === 2) { // Length-delimited (strings, nested messages)
        const length = reader.uint32();
        const data = reader.buf.slice(reader.pos, reader.pos + length);
        
        // Try to decode as text segment
        if (isTextData(data)) {
          const text = new TextDecoder().decode(data);
          if (text.trim().length > 0) {
            // This is very basic - would need timing info from surrounding fields
            segments.push({
              start_s: 0,
              end_s: 0,
              text: text.trim()
            });
          }
        }
        
        reader.skip(length);
      } else {
        reader.skipType(wireType);
      }
    }
    
    if (segments.length === 0) {
      throw new Error('No text segments found in raw decode');
    }
    
    warn(`Raw decode extracted ${segments.length} segments (timing info may be missing)`);
    return segments;
    
  } catch (err: any) {
    throw new Error(`Raw decode failed: ${err.message}`);
  }
}

function isTextData(data: Uint8Array): boolean {
  // Simple heuristic: check if data looks like UTF-8 text
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(data);
    return text.length > 0 && /^[\x20-\x7E\s]*$/.test(text.substring(0, 100));
  } catch {
    return false;
  }
}