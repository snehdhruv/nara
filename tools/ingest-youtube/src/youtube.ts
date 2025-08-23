import { Innertube } from 'youtubei.js';
import { extractVideoId, roundToDecimals } from './util';

export interface VideoMetadata {
  videoId: string;
  title: string;
  channel: string;
  duration_s: number;
  description: string;
  chapters?: Array<{
    title: string;
    start_time: number;
  }>;
}

export async function getVideoMetadata(urlOrId: string): Promise<VideoMetadata> {
  const videoId = extractVideoId(urlOrId);
  
  try {
    const youtube = await Innertube.create();
    const info = await youtube.getInfo(videoId);
    
    const basicInfo = info.basic_info;
    const duration_s = basicInfo.duration || 0;
    
    let chapters: Array<{ title: string; start_time: number }> | undefined;
    
    // Try to extract chapters from various locations in the API response
    try {
      const overlays = info.player_overlays as any;
      if (overlays?.decorated_player_bar?.player_bar?.multi_markers_player_bar?.markers_map) {
        const markersMap = overlays.decorated_player_bar.player_bar.multi_markers_player_bar.markers_map;
        const chapterMarkers = markersMap.find((marker: any) => marker.key === 'DESCRIPTION_CHAPTERS');
        
        if (chapterMarkers?.value?.chapters) {
          chapters = chapterMarkers.value.chapters.map((ch: any) => ({
            title: ch.title?.text || ch.title || 'Chapter',
            start_time: roundToDecimals((ch.time_range_start_millis || ch.start_time_ms || 0) / 1000)
          }));
        }
      }
    } catch (chapterError) {
      console.warn('Failed to extract chapters:', chapterError);
    }
    
    return {
      videoId: basicInfo.id || videoId,
      title: basicInfo.title || 'Unknown Title',
      channel: basicInfo.author || 'Unknown Channel',
      duration_s,
      description: basicInfo.short_description || '',
      chapters
    };
  } catch (error: any) {
    throw new Error(`Failed to fetch video metadata: ${error.message}`);
  }
}