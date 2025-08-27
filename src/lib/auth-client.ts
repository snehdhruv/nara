import { createAuthClient } from "better-auth/react";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
  plugins: [
    convexClient(),
    crossDomainClient(),
  ],
});
