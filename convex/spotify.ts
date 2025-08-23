import { v } from "convex/values";
import { action, query, mutation } from "./_generated/server";
import { api, components } from "./_generated/api";
import { betterAuthComponent } from "./auth";
import { createAuth } from "../src/lib/auth";
import { Id } from "./_generated/dataModel";

// Get user's Spotify account info using Better Auth's auth.api
export const getSpotifyAccount = query({
  args: {},
  handler: async (ctx) => {
    const user = await betterAuthComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Use Better Auth's auth.api.getAccessToken method
    const auth = createAuth(ctx);
    const accessTokenData = await auth.api.getAccessToken({
      body: {
        providerId: "spotify",
        userId: user.userId || "", // Handle null/undefined userId
      },
    });

    if (!accessTokenData) {
      throw new Error("No Spotify account linked");
    }

    return {
      userId: user.userId,
      accessToken: accessTokenData.accessToken,
      expiresAt: accessTokenData.accessTokenExpiresAt,
      scopes: accessTokenData.scopes,
      idToken: accessTokenData.idToken,
    };
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

    // Get the user's Spotify access token from the account
    const spotifyAccount = await ctx.runQuery(api.spotify.getSpotifyAccount);
    
    if (!spotifyAccount?.accessToken) {
      // For now, return the user info to debug
      return {
        error: "No Spotify access token",
        user: spotifyAccount,
        message: "Check the console logs for user data"
      };
    }

    try {
      // Fetch current playback from Spotify API
      const response = await fetch("https://api.spotify.com/v1/me/player", {
        headers: {
          "Authorization": `Bearer ${spotifyAccount.accessToken}`,
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
      
      // Store the playback state in our database
      await ctx.runMutation(api.spotify.updatePlaybackState, {
        playbackData,
        userId: user.userId as Id<"users">,
      });

      return playbackData;
    } catch (error) {
      console.error("Error fetching Spotify playback:", error);
      throw new Error("Failed to fetch current playback");
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
