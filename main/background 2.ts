// TODO(electron): create BrowserWindow; load Next; wire single-instance + external links
import path from 'path'
import { app, ipcMain } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import { AudioManager, getAudioConfig } from './audio'

const isProd = process.env.NODE_ENV === 'production'

// Global audio manager instance
let audioManager: AudioManager | null = null

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

;(async () => {
  await app.whenReady()

  const mainWindow = createWindow('main', {
    width: 1000,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (isProd) {
    await mainWindow.loadURL('app://./home')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/home`)
    mainWindow.webContents.openDevTools()
  }

  // Initialize audio pipeline after window is ready
  await initializeAudioPipeline(mainWindow)
})()

app.on('window-all-closed', () => {
  app.quit()
})

// Audio pipeline initialization
async function initializeAudioPipeline(mainWindow: Electron.BrowserWindow) {
  console.log('🎯 Initializing Nara Audio Pipeline...')

  try {
    // Get validated configuration
    const { vapi, tts } = getAudioConfig()

    // Create audio manager
    audioManager = new AudioManager(tts, vapi)

    // Set up event handlers
    setupAudioEventHandlers(mainWindow)

    // Initialize the pipeline
    await audioManager.initialize()

    console.log('✅ Audio pipeline initialized successfully')

    // Start listening for "Hey Nara"
    await audioManager.startListening()

    console.log('👂 Now listening for "Hey Nara"...')
    console.log('🎤 Try saying: "Hey Nara, who is the main character?"')

    // Send status to renderer
    mainWindow.webContents.send('audio-status', {
      status: 'ready',
      message: 'Audio pipeline ready - listening for "Hey Nara"'
    })

  } catch (error) {
    console.error('❌ Audio pipeline initialization failed:', error)

    // Send error to renderer
    mainWindow.webContents.send('audio-status', {
      status: 'error',
      message: `Audio initialization failed: ${error.message}`
    })
  }
}

// Set up audio event handlers
function setupAudioEventHandlers(mainWindow: Electron.BrowserWindow) {
  if (!audioManager) return

  audioManager.on('playbackPaused', (data) => {
    console.log(`🎯 Wake word detected! Spotify paused in ${data.latency}ms`)
    mainWindow.webContents.send('audio-event', {
      type: 'wakeWordDetected',
      data: { latency: data.latency }
    })
  })

  audioManager.on('playbackResumed', (data) => {
    console.log(`▶️ Response complete! Spotify resumed in ${data.latency}ms`)
    console.log('👂 Listening for "Hey Nara" again...')
    mainWindow.webContents.send('audio-event', {
      type: 'responseComplete',
      data: { latency: data.latency }
    })
  })

  audioManager.on('processingError', (error) => {
    console.error('❌ Audio processing error:', error)
    mainWindow.webContents.send('audio-event', {
      type: 'error',
      data: { error: error.message }
    })
  })
}

// IPC handlers for audio control
ipcMain.on('audio-trigger-wake-word', async (event) => {
  console.log('🧪 Manual wake word trigger from renderer')
  if (audioManager) {
    audioManager.triggerWakeWord()
  }
})

ipcMain.on('audio-get-status', async (event) => {
  if (audioManager) {
    const state = audioManager.getState()
    event.reply('audio-status-response', state)
  }
})

ipcMain.on('message', async (event, arg) => {
  event.reply('message', `${arg} World!`)
})
