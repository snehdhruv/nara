'use client';

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import type { Audiobook } from "@/lib/types";

interface ChapterPickerProps {
  audiobook: Audiobook;
}

export default function ChapterPicker({ audiobook }: ChapterPickerProps) {
  const chapters = useQuery(api.chapters.listByBook, {
    audiobookId: audiobook._id,
  });

  if (chapters === undefined) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No chapters found</h3>
        <p className="text-gray-600">This audiobook doesn't have any chapters yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {chapters.map((chapter) => (
        <Link
          key={chapter._id}
          href={`/audiobook/${audiobook.slug}/chapter/${chapter.idx}`}
          className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 block"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Chapter {chapter.idx}: {chapter.title}
              </h3>
              {chapter.spotifyChapterUri && (
                <p className="text-green-600 text-sm">🎵 Available on Spotify</p>
              )}
            </div>
            <div className="text-gray-400 text-sm">
              Chapter {chapter.idx}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
