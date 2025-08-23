import { NextRequest, NextResponse } from "next/server";
import { makeSpotifyRequest } from "@/lib/spotify";
import { z } from "zod";

const JumpRequestSchema = z.object({
  spotifyChapterUri: z.string(),
  deviceId: z.string().optional(),
  offsetMs: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = JumpRequestSchema.parse(body);

    // First, transfer playback to the specified device if provided
    if (validatedData.deviceId) {
      const transferResponse = await makeSpotifyRequest('/me/player', {
        method: 'PUT',
        body: JSON.stringify({
          device_ids: [validatedData.deviceId],
          play: false, // Don't start playing yet
        }),
      });

      if (!transferResponse.ok) {
        console.warn("Failed to transfer playback:", transferResponse.status);
      }

      // Wait a bit for device transfer
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Start playback of the chapter
    const playResponse = await makeSpotifyRequest('/me/player/play', {
      method: 'PUT',
      body: JSON.stringify({
        uris: [validatedData.spotifyChapterUri],
        position_ms: validatedData.offsetMs || 0,
      }),
    });

    if (!playResponse.ok) {
      const errorData = await playResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: "Failed to start playback",
          details: errorData
        },
        { status: playResponse.status }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Spotify jump error:", error);
    return NextResponse.json(
      { error: "Failed to jump to chapter" },
      { status: 500 }
    );
  }
}
