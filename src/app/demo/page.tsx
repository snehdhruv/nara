'use client';

/**
 * Simple Voice QA Demo - Test the conversational nature
 */

import { useState } from 'react';

interface QAResult {
  question: string;
  answer: string;
  citations: Array<{ type: string; ref: string }>;
  playbackHint?: { chapter_idx: number; start_s: number };
  latency: number;
  totalTime: number;
  interactionId: string;
}

interface ConnectionStatus {
  stt: boolean;
  tts: boolean;
  qa: boolean;
}

export default function VoiceQADemo() {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [qaHistory, setQaHistory] = useState<QAResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/voice-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConnectionStatus(data.status);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Connection test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const askQuestion = async () => {
    if (!question.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/voice-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'ask-question',
          question: question.trim()
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setQaHistory(prev => [...prev, data.result]);
        setQuestion(''); // Clear input
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Question failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  const sampleQuestions = [
    "What does Peter Thiel mean by zero to one?",
    "What are the characteristics of monopolies according to Thiel?",
    "How does Thiel define competition?",
    "What examples does he give of successful companies?",
    "What is the last mover advantage?"
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold mb-4">Voice QA Demo - Zero to One</h1>
          <p className="text-gray-600 mb-6">
            Test the conversational AI system using real Peter Thiel "Zero to One" audiobook data.
            Ask questions and get intelligent responses with citations and playback hints.
          </p>

          {/* Connection Test */}
          <div className="mb-6">
            <button
              onClick={testConnection}
              disabled={isLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Testing...' : 'Test Connection'}
            </button>

            {connectionStatus && (
              <div className="mt-4 p-4 bg-gray-50 rounded">
                <h3 className="font-semibold mb-2">Connection Status:</h3>
                <div className="space-y-1">
                  <div className={connectionStatus.stt ? 'text-green-600' : 'text-red-600'}>
                    STT (Speech-to-Text): {connectionStatus.stt ? '✓ Connected' : '✗ Failed'}
                  </div>
                  <div className={connectionStatus.tts ? 'text-green-600' : 'text-red-600'}>
                    TTS (Text-to-Speech): {connectionStatus.tts ? '✓ Connected' : '✗ Failed'}
                  </div>
                  <div className={connectionStatus.qa ? 'text-green-600' : 'text-red-600'}>
                    QA (Question Answering): {connectionStatus.qa ? '✓ Connected' : '✗ Failed'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Question Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Ask a question about Zero to One:</label>
            <div className="flex gap-2">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="What does Peter Thiel mean by zero to one?"
                className="flex-1 border rounded px-3 py-2 resize-none"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={askQuestion}
                disabled={isLoading || !question.trim()}
                className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Ask'}
              </button>
            </div>
          </div>

          {/* Sample Questions */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Sample Questions:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {sampleQuestions.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => setQuestion(sample)}
                  className="text-left text-sm bg-gray-100 hover:bg-gray-200 p-2 rounded"
                  disabled={isLoading}
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-800">
              Error: {error}
            </div>
          )}
        </div>

        {/* QA History */}
        <div className="space-y-6">
          {qaHistory.map((qa, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">
                  Question {index + 1} • {qa.totalTime}ms total • QA: {qa.latency}ms
                </div>
                <div className="font-medium text-blue-800">Q: {qa.question}</div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-700 mb-2">Answer:</div>
                <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap">
                  {qa.answer}
                </div>
              </div>

              {qa.citations && qa.citations.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-gray-700 mb-2">Citations ({qa.citations.length}):</div>
                  <div className="space-y-1">
                    {qa.citations.map((citation, citIndex) => (
                      <div key={citIndex} className="text-xs bg-blue-50 p-2 rounded">
                        [{citation.type}] {citation.ref}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {qa.playbackHint && (
                <div className="mb-2">
                  <div className="text-sm bg-green-50 p-2 rounded text-green-800">
                    💡 Playback Hint: Jump to Chapter {qa.playbackHint.chapter_idx} at {Math.floor(qa.playbackHint.start_s / 60)}:{(qa.playbackHint.start_s % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500">
                Interaction ID: {qa.interactionId}
              </div>
            </div>
          ))}

          {qaHistory.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No questions asked yet. Try asking something about Zero to One!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}