'use client';

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export default function BookPicker() {
  const audiobooks = useQuery(api.audiobooks.list);

  if (audiobooks === undefined) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (audiobooks.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No audiobooks found</h3>
        <p className="text-gray-600">Check back later or contact an administrator to add books.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {audiobooks.map((book) => (
        <Link
          key={book._id}
          href={`/audiobook/${book.slug}`}
          className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 block"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{book.title}</h3>
          <p className="text-gray-600 mb-2">Language: {book.language}</p>
          {book.spotifyAudiobookUri && (
            <p className="text-green-600 text-sm">🎵 Spotify integration available</p>
          )}
        </Link>
      ))}
    </div>
  );
}
