import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { headers } from "next/headers";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Get the current authenticated user from the request
 * Returns the user object or null if not authenticated
 */
export async function getCurrentUser(request?: Request) {
  try {
    // Extract auth token from headers - await headers() in Next.js 15
    const headersList = await headers();
    const authorization = headersList.get('authorization');
    
    if (!authorization) {
      return null;
    }

    // Use BetterAuth to get current user
    const user = await convex.query(api.auth.getCurrentUser, {});
    return user;
  } catch (error) {
    console.error('[Auth] Failed to get current user:', error);
    return null;
  }
}

/**
 * Require authentication for a route handler
 * Returns user object or throws error if not authenticated
 */
export async function requireAuth(request?: Request) {
  const user = await getCurrentUser(request);
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * Get user ID from authenticated request
 * Returns user ID or null if not authenticated
 */
export async function getUserId(request?: Request): Promise<string | null> {
  const user = await getCurrentUser(request);
  return user?.userId || null;
}