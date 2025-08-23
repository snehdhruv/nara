import { NextRequest, NextResponse } from "next/server";
import { getSpotifyAuthUrl } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  try {
    const authUrl = await getSpotifyAuthUrl();

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Spotify login error:", error);
    return NextResponse.json(
      { error: "Failed to generate Spotify auth URL" },
      { status: 500 }
    );
  }
}
