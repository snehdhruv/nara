# Spotify OAuth Setup Checklist

## Current Configuration Status ✅

### Convex Environment Variables
- ✅ `AUTH_SPOTIFY_ID`: `e580855765174e968959f00704c90d05`
- ✅ `AUTH_SPOTIFY_SECRET`: `eb8e5cbf9c95436792193fa21793f5c0`  
- ✅ `SITE_URL`: `https://astute-penguin-98.convex.site`

### Convex Functions
- ✅ Auth configuration deployed
- ✅ HTTP routes configured
- ✅ User functions available
- ✅ **Database schema and indexes created** - This was the missing piece!

### Database Indexes Created
- ✅ `authAccounts.providerAndAccountId` 
- ✅ `authAccounts.userIdAndProvider`
- ✅ `authSessions.userId`
- ✅ All other required auth indexes

## Required Spotify App Settings

**YOU MUST DO THIS IN YOUR SPOTIFY DEVELOPER DASHBOARD:**

1. Go to: https://developer.spotify.com/dashboard
2. Select your app with Client ID: `e580855765174e968959f00704c90d05`
3. Click "Edit Settings"
4. In "Redirect URIs", add EXACTLY this URL:
   ```
   https://astute-penguin-98.convex.site/api/auth/callback/spotify
   ```
5. Save the settings

## Testing Steps

After updating your Spotify app settings:

1. Start your development server: `bun run dev`
2. Open the app (it should open automatically)
3. Go to the home page
4. Click "Sign in with Spotify"
5. You should be redirected to Spotify's login page
6. After logging in, you should be redirected back to your app

## Troubleshooting

If you still get errors:

1. **Double-check the redirect URI** - it must be EXACTLY: `https://astute-penguin-98.convex.site/api/auth/callback/spotify`
2. **Wait a few minutes** - Spotify settings can take time to propagate
3. **Check your Spotify app status** - make sure it's not in "Development Mode" if you're using it publicly
4. **Clear browser cache** - Sometimes old OAuth tokens cause issues

## Success Indicators

When working correctly, you should see:
- Spotify login page opens when clicking "Sign in with Spotify"
- After login, you're redirected back to your app
- Your name and profile picture appear
- You can access the Spotify dashboard page
- No console errors related to authentication
