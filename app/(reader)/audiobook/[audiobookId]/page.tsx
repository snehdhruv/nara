import { notFound } from "next/navigation";
import { convex } from "@/lib/convex";
import ChapterPicker from "@/components/ChapterPicker";
import Link from "next/link";
import type { Audiobook } from "@/lib/types";

interface AudiobookPageProps {
  params: {
    audiobookId: string;
  };
}

export default async function AudiobookPage({ params }: AudiobookPageProps) {
  const audiobook = await convex.query("audiobooks", "getBySlug", {
    slug: params.audiobookId,
  }) as Audiobook | null;

  if (!audiobook) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-700"
            >
              ← Back to Books
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">{audiobook.title}</h1>
          <p className="text-gray-600 mb-4">Language: {audiobook.language}</p>

          {audiobook.spotifyAudiobookUri && (
            <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
              <p className="text-green-800 text-sm">
                🎵 This audiobook is available on Spotify
              </p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Chapters</h2>
          <ChapterPicker audiobook={audiobook} />
        </div>
      </div>
    </div>
  );
}
