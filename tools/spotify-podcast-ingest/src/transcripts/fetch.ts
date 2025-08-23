import { request } from 'undici';
import { withBackoff, isRetryableError } from '../util/backoff.js';
import { log, progress, warn, error } from '../util/log.js';
import { safeWriteFile } from '../util/fsx.js';
import { join } from 'path';
import { decodeTranscriptBuffer, type TranscriptSegment } from './proto/decode.js';

export interface TranscriptResult {
  segments: TranscriptSegment[];
  rawBuffer?: Uint8Array;
}

export async function fetchEpisodeTranscript(
  episodeId: string,
  transcriptUrl?: string,
  outputDir?: string
): Promise<TranscriptResult> {
  // Construct transcript URL if not provided
  const url = transcriptUrl || `https://episode-transcripts.spotifycdn.com/${episodeId}`;
  
  progress(`Fetching transcript: ${url}`);

  try {
    const buffer = await withBackoff(
      async () => {
        const response = await request(url, {
          method: 'GET',
          headers: {
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://open.spotify.com/'
          }
        });

        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          const error = new Error(`Transcript request failed: ${response.statusCode}`);
          (error as any).status = response.statusCode;
          (error as any).headers = response.headers;
          throw error;
        }

        return new Uint8Array(await response.body.arrayBuffer());
      },
      isRetryableError
    );

    log(`Downloaded transcript buffer: ${buffer.length} bytes`);

    // Try to decode the protobuf
    try {
      const segments = await decodeTranscriptBuffer(buffer);
      log(`✅ Decoded ${segments.length} transcript segments`);
      
      return { segments };
      
    } catch (decodeError: any) {
      warn(`Failed to decode transcript protobuf: ${decodeError.message}`);
      
      // Save raw buffer for debugging
      if (outputDir) {
        const binPath = join(outputDir, `${episodeId}.bin`);
        await safeWriteFile(binPath, buffer);
        warn(`Raw transcript buffer saved to: ${binPath}`);
      }
      
      return {
        segments: [],
        rawBuffer: buffer
      };
    }

  } catch (fetchError: any) {
    error(`Failed to fetch transcript: ${fetchError.message}`);
    throw fetchError;
  }
}