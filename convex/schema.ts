import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// The schema is normally optional, but Convex Auth
// requires indexes, so we need to define the schema.
export default defineSchema({
  // Auth tables for @convex-dev/auth
  // See https://labs.convex.dev/auth/setup
  ...authTables,
  
  // Your application tables
  messages: defineTable({
    author: v.string(),
    body: v.string(),
    timestamp: v.number(),
  }),
  
  favorites: defineTable({
    userId: v.id("users"),
    trackId: v.string(),
    trackName: v.string(),
    artist: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
