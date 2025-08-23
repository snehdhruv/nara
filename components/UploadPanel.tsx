'use client';

import { useState } from "react";
import type { ChapterMap, ChapterTranscript } from "@/lib/types";

export default function UploadPanel() {
  const [chapterMapFile, setChapterMapFile] = useState<File | null>(null);
  const [transcriptsFile, setTranscriptsFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const handleUpload = async () => {
    if (!chapterMapFile || !transcriptsFile) {
      alert('Please select both Chapter Map and Transcripts files');
      return;
    }

    setIsUploading(true);

    try {
      const chapterMapText = await chapterMapFile.text();
      const transcriptsText = await transcriptsFile.text();

      const chapterMap: ChapterMap = JSON.parse(chapterMapText);
      const transcripts: ChapterTranscript[] = JSON.parse(transcriptsText);

      const response = await fetch('/api/admin/bulk-ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapterMap,
          transcripts,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setUploadResult(result);
        alert('Upload successful!');
        // Reset form
        setChapterMapFile(null);
        setTranscriptsFile(null);
      } else {
        alert(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please check your files and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Bulk Ingest Audiobooks</h2>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chapter Map JSON
          </label>
          <input
            type="file"
            accept=".json"
            onChange={(e) => setChapterMapFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            JSON file containing audiobook metadata and chapter information
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chapter Transcripts JSON
          </label>
          <input
            type="file"
            accept=".json"
            onChange={(e) => setTranscriptsFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            JSON file containing transcript data for each chapter
          </p>
        </div>
      </div>

      <button
        onClick={handleUpload}
        disabled={!chapterMapFile || !transcriptsFile || isUploading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mb-4"
      >
        {isUploading ? 'Uploading...' : 'Upload and Process'}
      </button>

      {uploadResult && (
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <h3 className="text-green-900 font-semibold mb-2">Upload Successful!</h3>
          <div className="text-green-800 text-sm">
            <p>Audiobook ID: {uploadResult.audiobookId}</p>
            <p>Chapters: {uploadResult.chaptersCount}</p>
            <p>Transcripts: {uploadResult.transcriptsCount}</p>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">File Format Examples</h3>
        <details className="mb-2">
          <summary className="cursor-pointer text-blue-600">Chapter Map JSON Format</summary>
          <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-x-auto">
{`{
  "audiobook": {
    "id": "book-slug",
    "title": "Book Title",
    "language": "en",
    "spotifyAudiobookUri": "spotify:show:..."
  },
  "chapters": [
    {
      "idx": 1,
      "title": "Chapter 1",
      "spotifyChapterUri": "spotify:episode:..."
    }
  ]
}`}
          </pre>
        </details>
        <details>
          <summary className="cursor-pointer text-blue-600">Transcripts JSON Format</summary>
          <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-x-auto">
{`[
  {
    "audiobookId": "book-slug",
    "idx": 1,
    "text": "Chapter transcript text...",
    "rights": "public_domain"
  }
]`}
          </pre>
        </details>
      </div>
    </div>
  );
}
