import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// Query to get current user
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    
    return await ctx.db.get(userId);
  },
});

// Query to get user's Spotify playlists (mock for now)
export const getUserPlaylists = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }
    
    // This would typically fetch from Spotify API
    // For now, return mock data
    return [
      {
        id: "1",
        name: "My Favorite Songs",
        description: "Songs I love to listen to",
        image: "https://via.placeholder.com/300x300",
        track_count: 25
      },
      {
        id: "2", 
        name: "Workout Playlist",
        description: "High energy songs for working out",
        image: "https://via.placeholder.com/300x300",
        track_count: 15
      }
    ];
  },
});

// Mutation to save user's favorite track
export const saveFavoriteTrack = mutation({
  args: {
    trackId: v.string(),
    trackName: v.string(),
    artist: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    await ctx.db.insert("favorites", {
      userId: userId,
      trackId: args.trackId,
      trackName: args.trackName,
      artist: args.artist,
      createdAt: Date.now(),
    });
  },
});

// Query to get user's favorite tracks
export const getFavoriteTracks = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("favorites")
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .collect();
  },
});
