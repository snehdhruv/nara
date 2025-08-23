import { v } from "convex/values";
import { action, query, mutation } from "./_generated/server";
import { api, components } from "./_generated/api";
import { betterAuthComponent } from "./auth";
import { createAuth } from "../src/lib/auth";
import { Id } from "./_generated/dataModel";

// Helper function to detect if the current playback is an audiobook or podcast
function isAudiobookOrPodcast(playbackData: any): boolean {
  if (!playbackData?.item) return false;
  
  const item = playbackData.item;
  
  // Primary check: If it's an episode type, it's definitely a podcast/audiobook
  if (item.type === 'episode') {
    console.log('[Spotify] Detected episode:', item.name, 'from show:', item.show?.name);
    return true;
  }
  
  // Secondary check: Check if it's a track but from an audiobook/podcast
  if (item.type === 'track') {
    const album = item.album;
    const albumType = album?.album_type;
    
    // Check album type for audiobooks
    if (albumType === 'audiobook') {
      console.log('[Spotify] Detected audiobook by album type:', albumType, album.name);
      return true;
    }
    
    // Check context for shows (podcasts played as tracks)
    if (playbackData.context?.type === 'show') {
      console.log('[Spotify] Detected podcast from show context:', playbackData.context.uri);
      return true;
    }
    
    // Enhanced keyword detection for audiobooks and podcasts
    const albumName = album?.name?.toLowerCase() || '';
    const artistName = item.artists?.[0]?.name?.toLowerCase() || '';
    const trackName = item.name?.toLowerCase() || '';
    
    const audiobookIndicators = [
      'audiobook', 'audio book', 'unabridged', 'narrated by', 'read by', 'performed by',
      'chapter', 'part 1', 'part 2', 'part 3', 'book', 'novel', 'memoir', 'biography', 
      'autobiography', 'audio edition', 'listening library', 'brilliance audio',
      'tantor audio', 'macmillan audio', 'penguin random house audio'
    ];
    
    const podcastIndicators = [
      'podcast', 'episode', 'the joe rogan experience', 'lex fridman', 'tim ferriss',
      'talk', 'interview', 'conversation', 'show', 'cast', 'pod', 'npr', 'bbc',
      'radiolab', 'serial', 'this american life', 'ted talks', 'the daily',
      'smartless', 'conan', 'fresh air', 'planet money', 'stuff you should know'
    ];
    
    const allIndicators = [...audiobookIndicators, ...podcastIndicators];
    const foundIndicator = allIndicators.find(indicator =>
      albumName.includes(indicator) || artistName.includes(indicator) || trackName.includes(indicator)
    );
    
    if (foundIndicator) {
      console.log('[Spotify] Detected audio content by keyword:', foundIndicator);
      return true;
    }
    
    // Check track duration - audiobooks/podcasts are typically longer than songs
    const durationMinutes = (item.duration_ms || 0) / (1000 * 60);
    if (durationMinutes > 10) { // Tracks longer than 10 minutes are likely not songs
      // Additional check for typical music patterns to avoid false positives
      const musicKeywords = ['feat', 'ft.', 'remix', 'radio edit', 'single', 'deluxe', 'remaster'];
      const hasMusicKeywords = musicKeywords.some(keyword => 
        albumName.includes(keyword) || trackName.includes(keyword)
      );
      
      if (!hasMusicKeywords) {
        console.log('[Spotify] Long track detected (>10min), likely audio content:', trackName, `${Math.round(durationMinutes)}min`);
        return true;
      }
    }
  }
  
  return false;
}

// Helper function to control Spotify playback with better error handling
export const controlSpotifyPlayback = action({
  args: {
    action: v.union(v.literal("play"), v.literal("pause"), v.literal("next"), v.literal("previous")),
    positionMs: v.optional(v.number()),
    deviceId: v.optional(v.string()),
  },
  handler: async (ctx, { action, positionMs, deviceId }): Promise<{ success: boolean; device?: string; action: string }> => {
    const accessToken: string = await ctx.runAction(api.spotify.getSpotifyAccessToken);
    
    try {
      // First, check if we have an active device
      const devicesResponse: Response = await fetch("https://api.spotify.com/v1/me/player/devices", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      
      if (!devicesResponse.ok) {
        throw new Error(`Failed to get devices: ${devicesResponse.status}`);
      }
      
      const devicesData: any = await devicesResponse.json();
      const activeDevice: any = devicesData.devices?.find((d: any) => d.is_active) || devicesData.devices?.[0];
      
      if (!activeDevice) {
        throw new Error("No Spotify device available. Please open Spotify on a device first.");
      }
      
      let url = `https://api.spotify.com/v1/me/player/${action}`;
      let method = 'PUT';
      let body: any = undefined;
      
      // Handle different actions
      if (action === 'play' && positionMs !== undefined) {
        url = `https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}`;
      } else if (action === 'play') {
        // For play, we might need to specify device and context
        body = deviceId ? { device_ids: [deviceId] } : { device_ids: [activeDevice.id] };
      }
      
      const requestOptions: RequestInit = {
        method,
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      };
      
      if (body) {
        requestOptions.body = JSON.stringify(body);
      }
      
      const response = await fetch(url, requestOptions);
      
      // Spotify API returns 204 for successful playback control
      if (!response.ok && response.status !== 204) {
        const errorText = await response.text();
        console.error(`[Spotify] Control failed:`, {
          status: response.status,
          action,
          error: errorText,
          device: activeDevice.name
        });
        
        // Try to provide more helpful error messages
        if (response.status === 403) {
          throw new Error("Spotify Premium required for playback control");
        } else if (response.status === 404) {
          throw new Error("No active playback found. Please start playing something on Spotify first.");
        } else {
          throw new Error(`Spotify control failed: ${response.status} - ${errorText}`);
        }
      }
      
      console.log(`[Spotify] Successfully ${action === 'play' ? 'resumed' : action === 'pause' ? 'paused' : action} playback on ${activeDevice.name}`);
      return { 
        success: true, 
        device: activeDevice.name,
        action: action
      };
    } catch (error) {
      console.error(`[Spotify] Control action '${action}' failed:`, error);
      throw error;
    }
  },
});

// Get user's saved audiobooks and podcasts
export const getAudiobooksAndPodcasts = action({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 20, offset = 0 }): Promise<{
    podcasts: any[];
    audiobooks: any[];
    recentAudioContent: any[];
    total: {
      podcasts: number;
      audiobooks: number;
    };
  }> => {
    const accessToken: string = await ctx.runAction(api.spotify.getSpotifyAccessToken);
    
    try {
      // Get user's saved shows (podcasts)
      const showsResponse: Response = await fetch(
        `https://api.spotify.com/v1/me/shows?limit=${limit}&offset=${offset}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );
      
      // Get user's saved audiobooks
      const audiobooksResponse: Response = await fetch(
        `https://api.spotify.com/v1/me/audiobooks?limit=${limit}&offset=${offset}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );
      
      const shows: any = showsResponse.ok ? await showsResponse.json() : { items: [] };
      const audiobooks: any = audiobooksResponse.ok ? await audiobooksResponse.json() : { items: [] };
      
      // Also get recently played items that are audiobooks/podcasts
      const recentResponse = await fetch(
        'https://api.spotify.com/v1/me/player/recently-played?limit=50',
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );
      
      const recentData = recentResponse.ok ? await recentResponse.json() : { items: [] };
      const recentAudioContent = recentData.items.filter((item: any) => 
        isAudiobookOrPodcast({ item: item.track })
      );
      
      return {
        podcasts: shows.items || [],
        audiobooks: audiobooks.items || [],
        recentAudioContent: recentAudioContent || [],
        total: {
          podcasts: shows.total || 0,
          audiobooks: audiobooks.total || 0,
        }
      };
    } catch (error) {
      console.error("Error fetching audiobooks and podcasts:", error);
      throw new Error("Failed to fetch audio content");
    }
  },
});

// Search for audiobooks and podcasts
export const searchAudioContent = action({
  args: {
    query: v.string(),
    types: v.optional(v.array(v.union(v.literal("show"), v.literal("audiobook"), v.literal("episode")))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, types = ["show", "audiobook"], limit = 20 }): Promise<any> => {
    const accessToken: string = await ctx.runAction(api.spotify.getSpotifyAccessToken);
    
    try {
      const typeString = types.join(',');
      const response: Response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${typeString}&limit=${limit}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error searching audio content:", error);
      throw new Error("Failed to search audio content");
    }
  },
});

// Get user's Spotify access token using Better Auth
export const getSpotifyAccessToken = action({
  args: {},
  handler: async (ctx) => {
    const user = await betterAuthComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Use Better Auth's auth.api.getAccessToken method
    const auth = createAuth(ctx);
    try {
      const accessTokenData = await auth.api.getAccessToken({
        body: {
          providerId: "spotify",
          userId: user.userId!,
        },
      });

      if (!accessTokenData) {
        throw new Error("No Spotify account linked");
      }

      return accessTokenData.accessToken;
    } catch (error) {
      console.error("Failed to get Spotify access token:", error);
      throw new Error("Failed to get Spotify access token");
    }
  },
});

// Get current user's playback state from Spotify API
export const getCurrentPlayback = action({
  args: {},
  handler: async (ctx): Promise<any> => {
    const user = await betterAuthComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get the user's Spotify access token
    const accessToken = await ctx.runAction(api.spotify.getSpotifyAccessToken);
    
    if (!accessToken) {
      throw new Error("No Spotify access token available");
    }

    try {
      // Fetch current playback from Spotify API with additional_types=episode to get podcast episodes
      const response = await fetch("https://api.spotify.com/v1/me/player?additional_types=episode", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (response.status === 204) {
        // No active playback
        return null;
      }

      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status}`);
      }

      const playbackData = await response.json();
      
      // Check if it's an audiobook or podcast using the currently_playing_type field
      const isEpisode = playbackData.currently_playing_type === 'episode';
      const isAudioContent = isEpisode || isAudiobookOrPodcast(playbackData);
      
      if (isAudioContent) {
        console.log('[Spotify] Detected audio content:', {
          type: playbackData.currently_playing_type,
          name: playbackData.item?.name,
          show: playbackData.item?.show?.name || playbackData.item?.album?.name
        });
        
        // Store the playback state in our database
        await ctx.runMutation(api.spotify.updatePlaybackState, {
          playbackData,
          userId: user.userId as Id<"users">,
        });
        
        return playbackData;
      } else {
        // If it's a song or other non-audio content, return null
        // Only log this occasionally to avoid spam
        if (Math.random() < 0.1) { // Log only 10% of the time
          console.log('[Spotify] Currently playing music (filtered):', playbackData.item?.name);
        }
        return null;
      }
    } catch (error) {
      console.error("Error fetching Spotify playback:", error);
      throw new Error("Failed to fetch current playbook");
    }
  },
});

// Update playback state in database
export const updatePlaybackState = mutation({
  args: {
    playbackData: v.any(),
    userId: v.id("users"),
  },
  handler: async (ctx, { playbackData, userId }) => {
    if (!playbackData) {
      return;
    }

    // Check if we already have a playback state for this user
    const existingState = await ctx.db
      .query("playbackState")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const playbackStateData = {
      userId,
      isPlaying: playbackData.is_playing,
      progressMs: playbackData.progress_ms,
      lastUpdated: Date.now(),
      track: playbackData.item ? {
        id: playbackData.item.id,
        name: playbackData.item.name,
        artist: playbackData.item.artists?.[0]?.name || "Unknown",
        album: playbackData.item.album?.name || "Unknown",
        durationMs: playbackData.item.duration_ms,
        imageUrl: playbackData.item.album?.images?.[0]?.url,
      } : undefined,
      device: playbackData.device ? {
        id: playbackData.device.id,
        name: playbackData.device.name,
        type: playbackData.device.type,
        volumePercent: playbackData.device.volume_percent,
      } : undefined,
    };

    if (existingState) {
      // Update existing record
      await ctx.db.patch(existingState._id, playbackStateData);
    } else {
      // Create new record
      await ctx.db.insert("playbackState", playbackStateData);
    }

    // Add to listening history if this is a new track or resumed playback
    if (playbackData.is_playing && playbackData.item) {
      await ctx.db.insert("listeningHistory", {
        userId,
        trackId: playbackData.item.id,
        trackName: playbackData.item.name,
        artist: playbackData.item.artists?.[0]?.name || "Unknown",
        album: playbackData.item.album?.name || "Unknown",
        playedAt: Date.now(),
        durationPlayed: playbackData.progress_ms,
      });
    }
  },
});

// Get user's current playback state from database
export const getUserPlaybackState = query({
  args: {},
  handler: async (ctx) => {
    const user = await betterAuthComponent.getAuthUser(ctx);
    if (!user) {
      return null;
    }

    return await ctx.db
      .query("playbackState")
      .withIndex("by_user", (q) => q.eq("userId", user.userId as Id<"users">))
      .unique();
  },
});

// Get user's listening history
export const getListeningHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 50 }) => {
    const user = await betterAuthComponent.getAuthUser(ctx);
    if (!user) {
      return [];
    }

    return await ctx.db
      .query("listeningHistory")
      .withIndex("by_user", (q) => q.eq("userId", user.userId as Id<"users">))
      .order("desc")
      .take(limit);
  },
});

// Search for audiobooks on Spotify
export const searchAudiobooks = action({
  args: { 
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, limit = 20 }) => {
    const user = await betterAuthComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("User not authenticated");
    }

    const spotifyAccount = await ctx.runQuery(api.spotify.getSpotifyAccount);
    
    if (!spotifyAccount?.accessToken) {
      throw new Error("No Spotify access token available");
    }

    try {
      // Search for shows (which includes audiobooks and podcasts)
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=show&market=US&limit=${limit}`,
        {
          headers: {
            "Authorization": `Bearer ${spotifyAccount.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter for audiobooks (shows that are likely audiobooks)
      const audiobooks = data.shows?.items.filter((show: any) => 
        show.media_type === 'audiobook' || 
        show.description?.toLowerCase().includes('audiobook') ||
        show.description?.toLowerCase().includes('narrated') ||
        show.publisher?.toLowerCase().includes('audiobook') ||
        show.name?.toLowerCase().includes('audiobook')
      ) || [];

      return audiobooks.map((show: any) => ({
        id: show.id,
        title: show.name,
        author: show.publisher || 'Unknown Author',
        description: show.description,
        coverUrl: show.images?.[0]?.url || show.images?.[1]?.url,
        totalEpisodes: show.total_episodes,
        languages: show.languages,
        spotifyUri: show.uri,
        external_urls: show.external_urls,
      }));
    } catch (error) {
      console.error("Error searching audiobooks:", error);
      throw new Error("Failed to search audiobooks");
    }
  },
});

// Get audiobook episodes/chapters
export const getAudiobookEpisodes = action({
  args: { 
    showId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, { showId, limit = 50, offset = 0 }) => {
    const user = await betterAuthComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("User not authenticated");
    }

    const spotifyAccount = await ctx.runQuery(api.spotify.getSpotifyAccount);
    
    if (!spotifyAccount?.accessToken) {
      throw new Error("No Spotify access token available");
    }

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/shows/${showId}/episodes?market=US&limit=${limit}&offset=${offset}`,
        {
          headers: {
            "Authorization": `Bearer ${spotifyAccount.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        total: data.total,
        episodes: data.items.map((episode: any) => ({
          id: episode.id,
          title: episode.name,
          description: episode.description,
          duration_ms: episode.duration_ms,
          duration: Math.floor(episode.duration_ms / 1000), // Convert to seconds
          release_date: episode.release_date,
          spotifyUri: episode.uri,
          external_urls: episode.external_urls,
        }))
      };
    } catch (error) {
      console.error("Error fetching audiobook episodes:", error);
      throw new Error("Failed to fetch audiobook episodes");
    }
  },
});

// Get popular audiobooks (featured shows that are likely audiobooks)
export const getPopularAudiobooks = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 20 }) => {
    const user = await betterAuthComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("User not authenticated");
    }

    const spotifyAccount = await ctx.runQuery(api.spotify.getSpotifyAccount);
    
    if (!spotifyAccount?.accessToken) {
      throw new Error("No Spotify access token available");
    }

    try {
      // Search for popular audiobook-related terms
      const searchTerms = ['audiobook', 'narrated by', 'bestseller audiobook'];
      const allAudiobooks = [];

      for (const term of searchTerms) {
        const response = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(term)}&type=show&market=US&limit=${Math.ceil(limit / searchTerms.length)}`,
          {
            headers: {
              "Authorization": `Bearer ${spotifyAccount.accessToken}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const audiobooks = data.shows?.items.filter((show: any) => 
            show.media_type === 'audiobook' || 
            show.description?.toLowerCase().includes('audiobook') ||
            show.description?.toLowerCase().includes('narrated')
          ) || [];
          
          allAudiobooks.push(...audiobooks);
        }
      }

      // Remove duplicates and limit results
      const uniqueAudiobooks = allAudiobooks
        .filter((book, index, self) => 
          index === self.findIndex(b => b.id === book.id)
        )
        .slice(0, limit);

      return uniqueAudiobooks.map((show: any) => ({
        id: show.id,
        title: show.name,
        author: show.publisher || 'Unknown Author',
        description: show.description,
        coverUrl: show.images?.[0]?.url || show.images?.[1]?.url,
        totalEpisodes: show.total_episodes,
        languages: show.languages,
        spotifyUri: show.uri,
      }));
    } catch (error) {
      console.error("Error fetching popular audiobooks:", error);
      throw new Error("Failed to fetch popular audiobooks");
    }
  },
});
