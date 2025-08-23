'use client';

/**
 * Simple Test Interface - No complex imports
 */

import { useState } from 'react';

export default function TestPage() {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

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
      setConnectionStatus(data);
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
      setResult(data);
      
    } catch (err) {
      setError('Question failed');
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQuestions = [
    "What does Peter Thiel mean by zero to one?",
    "What are monopolies according to Thiel?",
    "How does Thiel define competition?",
    "What is the last mover advantage?",
    "Give me examples of successful companies he mentions"
  ];

  const playTTS = async (text: string) => {
    setIsPlayingAudio(true);
    setError(null);
    
    try {
      console.log('Playing TTS for:', text.substring(0, 50) + '...');
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) {
        throw new Error('TTS request failed');
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsPlayingAudio(false);
        setError('Audio playback failed');
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
      
    } catch (err) {
      setIsPlayingAudio(false);
      setError('TTS playback failed: ' + (err as Error).message);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '30px', 
          borderRadius: '10px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ margin: '0 0 15px 0', fontSize: '2.5em', color: '#333' }}>
            🎤 Voice QA Test - Zero to One
          </h1>
          <p style={{ margin: '0', color: '#666', fontSize: '1.1em' }}>
            Test the conversational AI system with real Peter Thiel audiobook data.
            Ask questions and get intelligent responses with citations and playback hints.
          </p>
        </div>

        {/* Connection Test */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '1.3em' }}>1. Test Connection</h2>
          
          <button
            onClick={testConnection}
            disabled={isLoading}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {isLoading ? 'Testing...' : 'Test All Services'}
          </button>

          {connectionStatus && (
            <div style={{ 
              marginTop: '15px', 
              padding: '15px', 
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e9ecef'
            }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1em' }}>Service Status:</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ color: connectionStatus.status?.stt ? '#28a745' : '#dc3545' }}>
                  STT (Speech-to-Text): {connectionStatus.status?.stt ? '✅ Connected' : '❌ Failed'}
                </div>
                <div style={{ color: connectionStatus.status?.tts ? '#28a745' : '#dc3545' }}>
                  TTS (Text-to-Speech): {connectionStatus.status?.tts ? '✅ Connected' : '❌ Failed'}
                </div>
                <div style={{ color: connectionStatus.status?.qa ? '#28a745' : '#dc3545' }}>
                  QA (Question Answering): {connectionStatus.status?.qa ? '✅ Connected' : '❌ Failed'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Question Interface */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '1.3em' }}>2. Ask Questions</h2>
          
          <div style={{ marginBottom: '15px' }}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What does Peter Thiel mean by zero to one?"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                resize: 'vertical',
                minHeight: '80px',
                boxSizing: 'border-box'
              }}
              disabled={isLoading}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={askQuestion}
              disabled={isLoading || !question.trim()}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: (!question.trim() || isLoading) ? 'not-allowed' : 'pointer',
                opacity: (!question.trim() || isLoading) ? 0.6 : 1
              }}
            >
              {isLoading ? 'Processing...' : 'Ask Question'}
            </button>
            
            <button
              onClick={() => setQuestion('')}
              disabled={isLoading}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              Clear
            </button>
          </div>

          {/* Sample Questions */}
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1em', color: '#666' }}>Sample Questions:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '8px' }}>
              {sampleQuestions.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => setQuestion(sample)}
                  disabled={isLoading}
                  style={{
                    textAlign: 'left',
                    padding: '10px',
                    backgroundColor: '#e9ecef',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => {
                    if (!isLoading) e.target.style.backgroundColor = '#dee2e6';
                  }}
                  onMouseOut={(e) => {
                    if (!isLoading) e.target.style.backgroundColor = '#e9ecef';
                  }}
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '15px',
            borderRadius: '6px',
            border: '1px solid #f5c6cb',
            marginBottom: '20px'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '1.3em', color: '#333' }}>Results</h2>
            
            {result.success ? (
              <div>
                {/* Question */}
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1em', color: '#007bff' }}>
                    Question:
                  </h3>
                  <p style={{ 
                    margin: '0', 
                    padding: '12px', 
                    backgroundColor: '#e3f2fd', 
                    borderRadius: '6px',
                    fontWeight: '500'
                  }}>
                    {result.result.question}
                  </p>
                </div>

                {/* Performance Stats */}
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '12px', 
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#666'
                }}>
                  ⚡ Response Time: {result.result.totalTime}ms | 
                  QA Latency: {result.result.latency}ms | 
                  ID: {result.result.interactionId}
                </div>

                {/* Answer */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '12px' }}>
                    <h3 style={{ margin: '0', fontSize: '1.1em', color: '#28a745' }}>
                      Answer:
                    </h3>
                    <button
                      onClick={() => playTTS(result.result.answer)}
                      disabled={isPlayingAudio}
                      style={{
                        backgroundColor: '#ff6b6b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '8px 16px',
                        fontSize: '14px',
                        cursor: isPlayingAudio ? 'not-allowed' : 'pointer',
                        opacity: isPlayingAudio ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {isPlayingAudio ? '🔊 Playing...' : '🔊 Hear Answer'}
                    </button>
                  </div>
                  <div style={{ 
                    padding: '15px', 
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #e9ecef',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6'
                  }}>
                    {result.result.answer}
                  </div>
                </div>

                {/* Citations */}
                {result.result.citations && result.result.citations.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1em', color: '#6f42c1' }}>
                      Citations ({result.result.citations.length}):
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {result.result.citations.map((citation: any, index: number) => (
                        <div key={index} style={{
                          padding: '8px 12px',
                          backgroundColor: '#f3e5f5',
                          borderRadius: '4px',
                          fontSize: '14px',
                          border: '1px solid #e1bee7'
                        }}>
                          <strong>[{citation.type}]</strong> {citation.ref}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Playback Hint */}
                {result.result.playbackHint && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#d4edda',
                    borderRadius: '6px',
                    border: '1px solid #c3e6cb',
                    color: '#155724'
                  }}>
                    <strong>💡 Playback Hint:</strong> Jump to Chapter {result.result.playbackHint.chapter_idx} at {Math.floor(result.result.playbackHint.start_s / 60)}:{(result.result.playbackHint.start_s % 60).toString().padStart(2, '0')}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: '#721c24' }}>
                <strong>Error:</strong> {result.error}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div style={{
          backgroundColor: '#fff3cd',
          padding: '20px',
          borderRadius: '10px',
          border: '1px solid #ffeaa7',
          color: '#856404'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2em' }}>How to Test:</h3>
          <ol style={{ margin: '0', paddingLeft: '20px' }}>
            <li>Click "Test All Services" to verify the system is working</li>
            <li>Type a question or click a sample question</li>
            <li>Click "Ask Question" and wait for the intelligent response</li>
            <li>Review the answer, citations, and any playback hints</li>
            <li>Try follow-up questions to see the conversational nature!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}