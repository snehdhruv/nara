import { convexAdapter } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { requireEnv } from "@convex-dev/better-auth/utils";
import { betterAuth } from "better-auth";
import { betterAuthComponent } from "../../convex/auth.js";
import { type GenericCtx } from "../../convex/_generated/server";

const siteUrl = requireEnv("SITE_URL");

export const createAuth = (ctx: GenericCtx) =>
  // Configure your Better Auth instance here
  betterAuth({
    trustedOrigins: [siteUrl],
    database: convexAdapter(ctx, betterAuthComponent),

    // Simple non-verified email/password to get started
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },

    socialProviders: {
        spotify: {
            clientId: process.env.AUTH_SPOTIFY_ID as string, 
            clientSecret: process.env.AUTH_SPOTIFY_SECRET as string,
            scope: [
                "user-read-email",
                "user-read-private", 
                "user-read-playback-state",
                "user-read-currently-playing",
                "user-read-playback-position",
                "user-read-recently-played",
                "streaming"
            ]
        }
    },

    plugins: [
      // The Convex plugin is required
      convex(),

      // The cross domain plugin is required for client side frameworks
      crossDomain({
        siteUrl,
      }),
    ],
  });
