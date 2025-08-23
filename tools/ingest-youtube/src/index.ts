import { CanonicalJson, CanonicalJsonSchema } from './schema';
import { getVideoMetadata } from './youtube';
import { fetchCaptionsYTDLP } from './captions-ytdlp';
import { parseChaptersFromDescription, reconcileChapters } from './chapters';
import { binSegmentsIntoChapters } from './binning';
import { writeJsonFile, sleep } from './util';
import path from 'path';

export interface IngestOptions {
  urlOrId: string;
  lang?: string;
  fallbackAuto?: boolean;
  minParagraphSentences?: number;
  maxParagraphSentences?: number;
  title?: string;
  rights?: 'owner_ok' | 'licensed' | 'public_domain';
  outputDir?: string;
}

export async function ingestVideo(options: IngestOptions): Promise<CanonicalJson> {
  const {
    urlOrId,
    lang = 'en',
    fallbackAuto = false,
    minParagraphSentences = 2,
    maxParagraphSentences = 4,
    title: overrideTitle,
    rights = 'owner_ok',
    outputDir
  } = options;
  
  console.log(`Fetching metadata for: ${urlOrId}`);
  const metadata = await getVideoMetadata(urlOrId);
  
  console.log(`Fetching captions (lang: ${lang}, fallbackAuto: ${fallbackAuto})`);
  const { segments: captionSegments, kind } = await fetchCaptionsYTDLP(
    metadata.videoId,
    { lang, fallbackAuto }
  );
  
  console.log(`Parsing chapters from description`);
  const descriptionChapters = parseChaptersFromDescription(
    metadata.description,
    metadata.duration_s
  );
  
  const chapters = reconcileChapters(
    metadata.chapters,
    descriptionChapters,
    metadata.duration_s
  );
  
  console.log(`Found ${chapters.length} chapters, binning ${captionSegments.length} segments`);
  const { segments, paragraphs } = binSegmentsIntoChapters(
    captionSegments,
    chapters,
    { minParagraphSentences, maxParagraphSentences }
  );
  
  const canonicalJson: CanonicalJson = {
    source: {
      platform: 'youtube',
      video_id: metadata.videoId,
      title: overrideTitle || metadata.title,
      channel: metadata.channel,
      duration_s: metadata.duration_s,
      rights,
      language: lang,
      captions_kind: kind
    },
    chapters,
    segments,
    paragraphs
  };
  
  const validated = CanonicalJsonSchema.parse(canonicalJson);
  
  if (outputDir) {
    const outputPath = path.join(outputDir, `${metadata.videoId}.json`);
    await writeJsonFile(outputPath, validated);
    console.log(`Saved to: ${outputPath}`);
  }
  
  return validated;
}

export async function ingestBatch(
  urlsOrIds: string[],
  options: Omit<IngestOptions, 'urlOrId'>
): Promise<Map<string, CanonicalJson | Error>> {
  const results = new Map<string, CanonicalJson | Error>();
  
  for (const urlOrId of urlsOrIds) {
    try {
      console.log(`\nProcessing: ${urlOrId}`);
      const result = await ingestVideo({ ...options, urlOrId });
      results.set(urlOrId, result);
      
      await sleep(1000);
    } catch (error: any) {
      console.error(`Failed to process ${urlOrId}: ${error.message}`);
      results.set(urlOrId, error);
    }
  }
  
  return results;
}

export { parseChaptersFromDescription } from './chapters';
export { binSegmentsIntoChapters } from './binning';
export type { CanonicalJson, Chapter, Segment, Paragraph } from './schema';