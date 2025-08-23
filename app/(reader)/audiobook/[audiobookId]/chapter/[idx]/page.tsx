import { notFound } from "next/navigation";
import { convex } from "@/lib/convex";
import TranscriptView from "@/components/TranscriptView";
import QABox from "@/components/QABox";
import PlayOnSpotify from "@/components/PlayOnSpotify";
import Link from "next/link";
import type { Audiobook, Chapter, ChapterTranscriptDoc } from "@/lib/types";

interface ChapterPageProps {
  params: {
    audiobookId: string;
    idx: string;
  };
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const chapterIdx = parseInt(params.idx);
  if (isNaN(chapterIdx)) {
    notFound();
  }

  // Fetch audiobook
  const audiobook = await convex.query("audiobooks", "getBySlug", {
    slug: params.audiobookId,
  }) as Audiobook | null;

  if (!audiobook) {
    notFound();
  }

  // Fetch chapter
  const chapter = await convex.query("chapters", "get", {
    audiobookId: audiobook._id,
    idx: chapterIdx,
  }) as Chapter | null;

  if (!chapter) {
    notFound();
  }

  // Fetch transcript
  const transcript = await convex.query("transcripts", "getByChapter", {
    audiobookId: audiobook._id,
    idx: chapterIdx,
  }) as ChapterTranscriptDoc | null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href={`/audiobook/${params.audiobookId}`}
              className="text-blue-600 hover:text-blue-700"
            >
              ← Back to Chapters
            </Link>
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-700"
            >
              ← Back to Books
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">{audiobook.title}</h1>
          <h2 className="text-xl text-gray-700 mb-4">
            Chapter {chapter.idx}: {chapter.title}
          </h2>

          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-blue-800 text-sm">
              <strong>🔒 Spoiler Protection:</strong> Questions are limited to Chapter {chapter.idx} and earlier content only.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Transcript */}
          <div className="lg:col-span-2">
            <TranscriptView transcript={transcript ? {
              audiobookId: transcript.audiobookId,
              idx: transcript.idx,
              text: transcript.text,
              segments: transcript.segments,
              rights: transcript.rights,
            } : null} />
          </div>

          {/* Right Column - QA and Spotify */}
          <div className="space-y-6">
            <QABox audiobook={audiobook} chapter={chapter} />
            <PlayOnSpotify chapter={chapter} />
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          {chapterIdx > 1 && (
            <Link
              href={`/audiobook/${params.audiobookId}/chapter/${chapterIdx - 1}`}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              ← Previous Chapter
            </Link>
          )}
          <div className="flex-1"></div>
          <Link
            href={`/audiobook/${params.audiobookId}`}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            All Chapters
          </Link>
        </div>
      </div>
    </div>
  );
}
