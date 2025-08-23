# Nara - Nextron + Convex + Spotify OAuth

A desktop music application built with Nextron (Next.js + Electron), Convex for backend/real-time data, and Spotify OAuth integration.

## Features

- ⚡ Electron desktop app with Next.js
- 🎵 Spotify OAuth authentication
- 📊 Convex real-time database
- 💬 Real-time messaging
- ❤️ Favorite tracks management
- 🎨 Tailwind CSS styling

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd /path/to/your/project
bun install
```

### 2. Set up Spotify OAuth

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Set the redirect URI to: `https://your-convex-site-url.convex.site/api/auth/callback/spotify`
   - You can find your Convex site URL in the `.env.local` file
4. Copy your Client ID and Client Secret

### 3. Configure Environment Variables

Update the Spotify credentials in your Convex deployment:

```bash
# Set your Spotify credentials
bunx convex env set AUTH_SPOTIFY_ID your_actual_spotify_client_id
bunx convex env set AUTH_SPOTIFY_SECRET your_actual_spotify_client_secret
```

### 4. Start Development

```bash
# This will start both Convex dev server and Nextron
bun run dev
```

## Usage

1. **Authentication**: Click "Sign in with Spotify" to authenticate with your Spotify account
2. **View Playlists**: Once authenticated, navigate to the Spotify page to see your playlists (mock data for now)
3. **Add Favorites**: Add tracks to your favorites list
4. **Real-time Messages**: Send and receive messages in real-time using Convex

## Project Structure

```
├── convex/                 # Convex backend functions
│   ├── auth.ts            # Authentication configuration
│   ├── users.ts           # User-related functions
│   ├── messages.ts        # Message functions
│   └── http.ts            # HTTP routes for OAuth
├── renderer/              # Next.js frontend
│   └── pages/
│       ├── _app.tsx       # App wrapper with Convex providers
│       ├── home.tsx       # Main page
│       └── spotify.tsx    # Spotify integration page
├── main/                  # Electron main process
└── resources/             # App resources (icons, etc.)
```

## Technologies Used

- **Nextron**: Next.js + Electron for cross-platform desktop apps
- **Convex**: Real-time backend-as-a-service
- **Spotify Web API**: Music platform integration
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: Type-safe development

## Convex Functions

### Authentication
- `auth.signIn()` - Sign in with Spotify
- `auth.signOut()` - Sign out user

### Users
- `users.currentUser()` - Get current authenticated user
- `users.getUserPlaylists()` - Get user's Spotify playlists (mock)
- `users.saveFavoriteTrack()` - Save a track to favorites
- `users.getFavoriteTracks()` - Get user's favorite tracks

### Messages
- `messages.getMessages()` - Get all messages
- `messages.sendMessage()` - Send a new message
- `messages.getGreeting()` - Get welcome message

## Development Notes

- The Spotify integration currently uses mock playlist data
- To implement real Spotify API calls, you'll need to store OAuth tokens and make API requests
- The OAuth flow is handled by Convex Auth with automatic callback handling
- All user data is stored in Convex's real-time database

## Next Steps

To extend this application, you could:

1. **Real Spotify Integration**: Implement actual Spotify Web API calls
2. **Music Player**: Add audio playback functionality
3. **Playlist Management**: Allow creating/editing playlists
4. **Social Features**: Share music with other users
5. **Offline Support**: Cache music data for offline use

## Troubleshooting

### OAuth Issues
- Ensure your Spotify redirect URI matches exactly: `https://your-site.convex.site/api/auth/callback/spotify`
- Check that your Spotify app has the correct scopes enabled
- Verify environment variables are set correctly in Convex

### Development Issues
- Make sure Convex dev server is running: `bunx convex dev`
- Check the browser console for any authentication errors
- Verify your Convex deployment is active in the dashboard
