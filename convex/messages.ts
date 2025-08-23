import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query to get all messages
export const getMessages = query({
  args: {},
  handler: async (ctx) => {
    // Get the most recent 50 messages
    const messages = await ctx.db.query("messages").order("desc").take(50);
    // Return them in chronological order
    return messages.reverse();
  },
});

// Mutation to send a new message
export const sendMessage = mutation({
  args: {
    author: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    // Insert a new message into the database
    await ctx.db.insert("messages", {
      author: args.author,
      body: args.body,
      timestamp: Date.now(),
    });
  },
});

// Query to get a simple greeting (for testing)
export const getGreeting = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return `Hello, ${args.name}! Welcome to your Convex-powered app.`;
  },
});
