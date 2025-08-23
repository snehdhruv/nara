import RequireAuth from "@/components/RequireAuth";
import UploadPanel from "@/components/UploadPanel";

export default function AdminIngestPage() {
  return (
    <RequireAuth>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin: Bulk Ingest</h1>
            <p className="text-gray-600">
              Upload chapter maps and transcripts to add new audiobooks to the system.
            </p>
          </div>

          <UploadPanel />

          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">Instructions</h2>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>Prepare a Chapter Map JSON file with audiobook metadata and chapter information</li>
              <li>Prepare a Transcripts JSON file with transcript data for each chapter</li>
              <li>Upload both files using the form above</li>
              <li>The system will validate and process the data</li>
              <li>Once complete, the audiobook will be available to users</li>
            </ol>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
