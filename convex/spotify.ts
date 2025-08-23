import { v } from "convex/values";
import { action, query, mutation } from "./_generated/server";
import { api, components } from "./_generated/api";
import { betterAuthComponent } from "./auth";
import { createAuth } from "../src/lib/auth";
import { Id } from "./_generated/dataModel";

// Get user's Spotify account info - ACTION (not query) since it calls external APIs
export const getSpotifyAccount = action({
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
    } catch (error) {
      console.error("Error getting Spotify access token:", error);
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

    // Get the user's Spotify access token from the account
    const spotifyAccount = await ctx.runAction(api.spotify.getSpotifyAccount, {});
    
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

// Debug action to test authentication flow
export const debugAuth = action({
  args: {},
  handler: async (ctx) => {
    try {
      console.log("🔍 Starting auth debug...");
      
      // Check if user is authenticated
      const user = await betterAuthComponent.getAuthUser(ctx);
      console.log("📱 User from betterAuthComponent:", user);
      
      if (!user) {
        return {
          success: false,
          error: "No authenticated user",
          user: null,
        };
      }

      // Try to create auth instance
      const auth = createAuth(ctx);
      console.log("🔐 Auth instance created");
      
      // Try to get access token
      try {
        const accessTokenData = await auth.api.getAccessToken({
          body: {
            providerId: "spotify",
            userId: user.userId || "",
          },
        });
        
        console.log("🎵 Spotify access token data:", {
          hasToken: !!accessTokenData?.accessToken,
          expiresAt: accessTokenData?.accessTokenExpiresAt,
          scopes: accessTokenData?.scopes,
        });

        return {
          success: true,
          user: {
            id: user.userId,
            email: user.email,
            name: user.name,
          },
          spotify: {
            hasToken: !!accessTokenData?.accessToken,
            tokenLength: accessTokenData?.accessToken?.length,
            expiresAt: accessTokenData?.accessTokenExpiresAt,
            scopes: accessTokenData?.scopes,
          },
        };
      } catch (tokenError) {
        console.error("❌ Error getting access token:", tokenError);
        return {
          success: false,
          error: "Failed to get Spotify access token",
          details: String(tokenError),
          user: {
            id: user.userId,
            email: user.email,
            name: user.name,
          },
        };
      }
    } catch (error) {
      console.error("💥 Debug auth error:", error);
      return {
        success: false,
        error: "Auth debug failed",
        details: String(error),
      };
    }
  },
});
