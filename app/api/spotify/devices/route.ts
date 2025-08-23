import { NextRequest, NextResponse } from "next/server";
import { makeSpotifyRequest } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  try {
    const response = await makeSpotifyRequest('/me/player/devices');

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Spotify devices" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Spotify devices error:", error);
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    );
  }
}
