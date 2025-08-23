import RequireAuth from "@/components/RequireAuth";
import BookPicker from "@/components/BookPicker";
import Link from "next/link";

export default function AdminBooksPage() {
  return (
    <RequireAuth>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin: Manage Books</h1>
            <p className="text-gray-600 mb-4">
              View all audiobooks, their chapters, and transcript status.
            </p>
            <div className="flex gap-4">
              <Link
                href="/admin/ingest"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Bulk Ingest
              </Link>
              <Link
                href="/"
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>

          <BookPicker />
        </div>
      </div>
    </RequireAuth>
  );
}
