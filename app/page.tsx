import BookPicker from "@/components/BookPicker";
import Link from "next/link";

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Nara - Audiobook Chapter QA
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Ask spoiler-safe questions about audiobook chapters with AI-powered answers
          </p>

          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">✨ Key Features</h3>
            <ul className="text-blue-800 text-left max-w-md mx-auto space-y-1">
              <li>• Spoiler-safe chapter-scoped Q&A</li>
              <li>• Spotify audiobook integration</li>
              <li>• Bulk chapter and transcript upload</li>
              <li>• AI-powered answers with LangGraph</li>
            </ul>
          </div>

          <Link
            href="/admin/books"
            className="inline-block bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors"
          >
            Admin Panel
          </Link>
        </div>

        {/* Books */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Available Audiobooks</h2>
          <BookPicker />
        </div>
      </div>
    </main>
  );
}
