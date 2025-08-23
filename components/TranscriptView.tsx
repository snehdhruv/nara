import type { ChapterTranscript } from "@/lib/types";

interface TranscriptViewProps {
  transcript: ChapterTranscript | null;
}

export default function TranscriptView({ transcript }: TranscriptViewProps) {
  if (!transcript) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-600">No transcript available for this chapter.</p>
      </div>
    );
  }

  if (transcript.segments && transcript.segments.length > 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Chapter Transcript</h3>
        <div className="space-y-3">
          {transcript.segments.map((segment, index) => (
            <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
              <div className="text-sm text-gray-500 mb-1">
                {formatTime(segment.startMs)} - {formatTime(segment.endMs)}
              </div>
              <div className="text-gray-700 leading-relaxed">
                {segment.text}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-gray-500">
          Rights: {transcript.rights}
        </div>
      </div>
    );
  }

  if (transcript.text) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Chapter Transcript</h3>
        <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
          {transcript.text}
        </div>
        <div className="mt-4 text-xs text-gray-500">
          Rights: {transcript.rights}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-6 text-center">
      <p className="text-gray-600">No transcript content available for this chapter.</p>
    </div>
  );
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
