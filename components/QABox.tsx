'use client';

import { useState } from "react";
import type { Audiobook, Chapter } from "@/lib/types";

interface QABoxProps {
  audiobook: Audiobook;
  chapter: Chapter;
}

interface QA {
  question: string;
  answer: string;
  ok: boolean;
  reason?: string;
}

export default function QABox({ audiobook, chapter }: QABoxProps) {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState<QA[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audiobookId: audiobook.slug,
          idx: chapter.idx,
          question: question.trim(),
        }),
      });

      const data = await response.json();

      setQaHistory(prev => [...prev, {
        question: question.trim(),
        answer: data.answer || data.error || 'No response',
        ok: data.ok || false,
        reason: data.reason,
      }]);

      setQuestion("");
    } catch (error) {
      console.error('QA error:', error);
      setQaHistory(prev => [...prev, {
        question: question.trim(),
        answer: 'Sorry, there was an error processing your question.',
        ok: false,
        reason: 'Network error',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Ask a Question</h2>

      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-blue-800 text-sm">
          <strong>💡 Spoiler-safe:</strong> I can only answer questions about Chapter {chapter.idx} and earlier content.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`Ask about Chapter ${chapter.idx}...`}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Thinking...' : 'Ask'}
          </button>
        </div>
      </form>

      {qaHistory.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Q&A History</h3>
          {qaHistory.map((qa, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="mb-2">
                <strong className="text-gray-900">Q: </strong>
                <span className="text-gray-700">{qa.question}</span>
              </div>
              <div className="mb-2">
                <strong className="text-gray-900">A: </strong>
                <span className={qa.ok ? "text-gray-700" : "text-red-600"}>
                  {qa.answer}
                </span>
              </div>
              {!qa.ok && qa.reason && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  <strong>Reason:</strong> {qa.reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
