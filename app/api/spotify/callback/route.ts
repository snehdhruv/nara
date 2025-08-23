import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error("Spotify auth error:", error);
      return NextResponse.redirect(
        new URL('/?error=spotify_auth_failed', request.url)
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: "No authorization code provided" },
        { status: 400 }
      );
    }

    await exchangeCodeForTokens(code);

    return NextResponse.redirect(
      new URL('/?success=spotify_connected', request.url)
    );

  } catch (error) {
    console.error("Spotify callback error:", error);
    return NextResponse.redirect(
      new URL('/?error=spotify_callback_failed', request.url)
    );
  }
}
