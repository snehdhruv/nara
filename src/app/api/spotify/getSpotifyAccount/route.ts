import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from '../../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    // Get the user's Spotify account info including access token
    const spotifyAccount = await convex.query(api.spotify.getSpotifyAccount);
    
    return NextResponse.json(spotifyAccount);
    
  } catch (error) {
    console.error('[Spotify API] Failed to get account:', error);
    return NextResponse.json(
      { error: 'Failed to get Spotify account' },
      { status: 500 }
    );
  }
}