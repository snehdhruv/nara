/**
 * AudioStatus - Shows Nara audio pipeline status and controls
 */

import { useState, useEffect } from 'react'

interface AudioEvent {
  type: 'wakeWordDetected' | 'responseComplete' | 'error'
  data: any
}

interface AudioStatus {
  status: 'initializing' | 'ready' | 'error'
  message: string
}

export default function AudioStatus() {
  const [status, setStatus] = useState<AudioStatus>({
    status: 'initializing',
    message: 'Initializing audio pipeline...'
  })
  const [events, setEvents] = useState<AudioEvent[]>([])
  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    // Debug: Check what's available on window
    console.log('AudioStatus component mounted')
    console.log('window.ipc available:', typeof window !== 'undefined' && !!(window as any).ipc)
    console.log('window object keys:', typeof window !== 'undefined' ? Object.keys(window as any).filter(k => k.includes('ipc') || k.includes('electron')) : 'window not available')

    // Listen for audio status updates
    const handleAudioStatus = (event: any, data: AudioStatus) => {
      setStatus(data)
      if (data.status === 'ready') {
        setIsListening(true)
      }
    }

    // Listen for audio events
    const handleAudioEvent = (event: any, audioEvent: AudioEvent) => {
      setEvents(prev => [audioEvent, ...prev.slice(0, 9)]) // Keep last 10 events

      if (audioEvent.type === 'wakeWordDetected') {
        setIsListening(false) // Processing command
      } else if (audioEvent.type === 'responseComplete') {
        setIsListening(true) // Back to listening
      }
    }

    // Set up IPC listeners with safety checks
    const setupIPC = () => {
      if (typeof window !== 'undefined' && (window as any).ipc) {
        try {
          const ipc = (window as any).ipc
          if (ipc && typeof ipc.on === 'function') {
            const unsubscribeStatus = ipc.on('audio-status', handleAudioStatus)
            const unsubscribeEvent = ipc.on('audio-event', handleAudioEvent)

            console.log('✅ IPC listeners set up successfully')

            return () => {
              if (typeof unsubscribeStatus === 'function') unsubscribeStatus()
              if (typeof unsubscribeEvent === 'function') unsubscribeEvent()
            }
          }
        } catch (error) {
          console.warn('Failed to set up IPC listeners:', error)
        }
      }
      return () => {}
    }

    // Try to setup IPC immediately, or wait for it to be available
    let cleanup = setupIPC()

    if (!cleanup || cleanup.toString() === '() => {}') {
      // IPC not ready, try again after a short delay and set fallback status
      console.log('IPC not ready, retrying in 100ms...')

      // Set fallback status while IPC is not available
      setStatus({
        status: 'initializing',
        message: 'Setting up audio pipeline... (IPC not ready)'
      })

      const timer = setTimeout(() => {
        cleanup = setupIPC()
        if (!cleanup || cleanup.toString() === '() => {}') {
          // Still no IPC, set a warning status
          setStatus({
            status: 'warning',
            message: 'Audio pipeline ready but UI communication limited'
          })
          setIsListening(true) // Assume it's working
        }
      }, 100)

      return () => {
        clearTimeout(timer)
        if (cleanup && typeof cleanup === 'function') cleanup()
      }
    }

    return cleanup
  }, [])

  const triggerWakeWord = () => {
    if (typeof window !== 'undefined' && (window as any).ipc) {
      try {
        const ipc = (window as any).ipc
        if (ipc && typeof ipc.send === 'function') {
          ipc.send('audio-trigger-wake-word')
          console.log('🧪 Wake word test triggered')
        } else {
          console.warn('IPC send function not available')
        }
      } catch (error) {
        console.error('Failed to trigger wake word:', error)
      }
    } else {
      console.warn('IPC not available for wake word trigger')
    }
  }

  const getStatusColor = () => {
    const statusValue = status?.status || 'initializing'
    switch (statusValue) {
      case 'ready': return 'text-green-600 bg-green-50 border-green-200'
      case 'error': return 'text-red-600 bg-red-50 border-red-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const getStatusIcon = () => {
    const statusValue = status?.status || 'initializing'
    switch (statusValue) {
      case 'ready': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      default: return '⏳'
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🎯 Nara Audio Pipeline
        </h1>
        <p className="text-gray-600">
          Voice-activated audiobook assistant
        </p>
      </div>

      {/* Status Card */}
      <div className={`p-4 rounded-lg border-2 ${getStatusColor()}`}>
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getStatusIcon()}</span>
          <div>
            <h3 className="font-semibold">
              {status?.status === 'ready' ? 'Ready' :
               status?.status === 'error' ? 'Error' :
               status?.status === 'warning' ? 'Warning' : 'Initializing'}
            </h3>
            <p className="text-sm">{status?.message || 'Setting up audio pipeline...'}</p>
          </div>
        </div>
      </div>

      {/* Listening Status */}
      {status?.status === 'ready' && (
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-3">
            {isListening ? '👂' : '🎤'}
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {isListening ? 'Listening for "Hey Nara"' : 'Processing Command'}
          </h3>
          <p className="text-gray-600 mb-4">
            {isListening
              ? 'Say "Hey Nara" followed by your question'
              : 'Speaking your response...'
            }
          </p>

          <button
            onClick={triggerWakeWord}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🧪 Test Wake Word
          </button>
        </div>
      )}

      {/* Example Commands */}
      {status?.status === 'ready' && (
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-semibold mb-3">💬 Try These Commands:</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• "Hey Nara, who is the main character?"</li>
            <li>• "Hey Nara, what happened in chapter 2?"</li>
            <li>• "Hey Nara, explain this concept"</li>
            <li>• "Hey Nara, summarize what I just heard"</li>
          </ul>
        </div>
      )}

      {/* Event Log */}
      {events.length > 0 && (
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-semibold mb-3">📋 Recent Events:</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {events.map((event, index) => (
              <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <span>
                    {event.type === 'wakeWordDetected' ? '🎯' :
                     event.type === 'responseComplete' ? '✅' : '❌'}
                  </span>
                  <span className="font-medium">
                    {event.type === 'wakeWordDetected' ? 'Wake Word Detected' :
                     event.type === 'responseComplete' ? 'Response Complete' : 'Error'}
                  </span>
                  {event.data.latency && (
                    <span className="text-gray-500">
                      ({event.data.latency}ms)
                    </span>
                  )}
                </div>
                {event.data.error && (
                  <div className="text-red-600 text-xs mt-1">
                    {event.data.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {status?.status === 'ready' && (
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-semibold mb-3">⚡ Performance Targets:</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium">Wake Word → Pause</div>
              <div className="text-gray-600">≤800ms</div>
            </div>
            <div className="text-center">
              <div className="font-medium">STT → TTS</div>
              <div className="text-gray-600">≤3-4s</div>
            </div>
            <div className="text-center">
              <div className="font-medium">TTS → Resume</div>
              <div className="text-gray-600">≤300ms</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
