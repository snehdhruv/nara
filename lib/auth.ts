import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: {
    // We'll use Convex for user storage
    // This is a placeholder - in production you'd implement proper storage
    type: "memory", // For demo purposes
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    // You can add social providers here if needed
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  cookies: nextCookies(),
});
