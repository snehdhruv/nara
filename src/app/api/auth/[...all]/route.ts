import { nextJsHandler } from "@convex-dev/better-auth/nextjs";
import { ConvexHttpClient } from "convex/browser";
import { createAuth } from "@/lib/auth";

// Create a Convex HTTP client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Initialize auth with the Convex client as context
const auth = createAuth(convex as any);

// Export the configured handlers
export const { GET, POST } = nextJsHandler(auth);