import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    {
      id: "spotify",
      name: "Spotify",
      type: "oauth",
      authorization: {
        url: "https://accounts.spotify.com/authorize",
        params: {
          scope: "user-read-email user-read-private playlist-read-private user-library-read",
          response_type: "code",
        },
      },
      token: "https://accounts.spotify.com/api/token",
      userinfo: "https://api.spotify.com/v1/me",
      profile(profile: any) {
        return {
          id: profile.id,
          name: profile.display_name || profile.id,
          email: profile.email,
          image: profile.images?.[0]?.url,
        };
      },
      clientId: process.env.AUTH_SPOTIFY_ID,
      clientSecret: process.env.AUTH_SPOTIFY_SECRET,
    } as any,
  ],
});
