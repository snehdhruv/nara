import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a seed user for testing
export const createSeedUser = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      name: args.name || "Test User",
      email: args.email || "test@example.com",
    });
    
    return userId;
  },
});

// Load Zero to One audiobook data from file
async function loadZeroToOneData() {
  // Note: In a real implementation, we'd read from the file system
  // For now, we'll use the actual data structure from zero-to-one.json
  return {
    source: {
      platform: "youtube",
      video_id: "dz_4Mjyqbqk",
      title: "Zero to One By Peter Thiel #audiobooks",
      channel: "Year of Inspiration",
      duration_s: 16982,
      rights: "owner_ok",
      language: "en",
      captions_kind: "human"
    },
    chapters: [
      { idx: 1, title: "Chapter 1: The Challenge of the Future", start_s: 0, end_s: 569 },
      { idx: 2, title: "Chapter 2: Party Like It's 1999", start_s: 569, end_s: 1561 },
      { idx: 3, title: "Chapter 3: All Happy Companies Are Different", start_s: 1561, end_s: 2653 },
      { idx: 4, title: "Chapter 4: The Ideology of Competition", start_s: 2653, end_s: 3581 },
      { idx: 5, title: "Chapter 5: Last Mover Advantage", start_s: 3581, end_s: 5006 },
      { idx: 6, title: "Chapter 6: You Are Not a Lottery Ticket", start_s: 5006, end_s: 7125 },
      { idx: 7, title: "Chapter 7: Follow the Money", start_s: 7125, end_s: 8217 },
      { idx: 8, title: "Chapter 8: Secrets", start_s: 8217, end_s: 9365 },
      { idx: 9, title: "Chapter 9: Foundations", start_s: 9365, end_s: 10457 },
      { idx: 10, title: "Chapter 10: The Mechanics of Mafia", start_s: 10457, end_s: 11549 },
      { idx: 11, title: "Chapter 11: If You Build It, Will They Come?", start_s: 11549, end_s: 12641 },
      { idx: 12, title: "Chapter 12: Man and Machine", start_s: 12641, end_s: 13733 },
      { idx: 13, title: "Chapter 13: Seeing Green", start_s: 13733, end_s: 15825 },
      { idx: 14, title: "Chapter 14: The Founder's Paradox", start_s: 15825, end_s: 16982 }
    ]
  };
}

// Seed the Zero to One audiobook
export const seedZeroToOneAudiobook = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already exists
    const existing = await ctx.db
      .query("audiobooks")
      .withIndex("by_youtube_id", (q) => q.eq("youtubeVideoId", "dz_4Mjyqbqk"))
      .first();
    
    if (existing) {
      return existing._id;
    }
    
    // Load real data from zero-to-one.json structure
    const zeroToOneData = await loadZeroToOneData();
    
    // Create the Zero to One audiobook with real data
    const audiobookId = await ctx.db.insert("audiobooks", {
      title: zeroToOneData.source.title,
      author: "Peter Thiel",
      narrator: "Blake Masters", 
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=zero-to-one",
      duration: zeroToOneData.source.duration_s,
      description: "Notes on Startups, or How to Build the Future",
      youtubeVideoId: zeroToOneData.source.video_id,
      totalChapters: zeroToOneData.chapters.length,
      isYouTube: false,
      chapters: zeroToOneData.chapters,
      content: [], // Content will be populated separately if needed
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return audiobookId;
  },
});

// Get the first user (for demo purposes)
export const getFirstUser = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(1);
    return users;
  },
});