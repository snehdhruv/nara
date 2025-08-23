/**
 * VoiceAgentBridge - Main orchestrator connecting STT → LangGraph → TTS
 * Handles barge-in, latency metrics, and complete voice interaction flow
 */

import { EventEmitter } from 'events';
import { VapiService } from './VapiService';
import { TTSService } from './TTSService';
import { AudioManager } from './AudioManager';
import { AudioOrchestrator } from './AudioOrchestrator';
import { ChapterIndexResolver } from './ChapterIndexResolver';
import { LangGraphRunner } from '../../agents/langgraph/adapters/Runner';

export interface VoiceContext {
  audiobookId: string;
  datasetPath: string;
  currentPosition_s: number;
  playbackChapterIdx?: number;
  userProgressIdx: number;
  modeHint?: "auto" | "full" | "compressed" | "focused";
}

export interface VoiceAgentBridgeOptions {
  vapi: VapiService;
  tts: TTSService;
  audio: AudioManager;
  runner: LangGraphRunner;
  context: VoiceContext;
  orchestrator?: AudioOrchestrator;
  chapterResolver?: ChapterIndexResolver;
}

export interface QAResult {
  markdown: string;
  citations: Array<{ type: "para" | "time"; ref: string }>;
  playbackHint?: { chapter_idx: number; start_s: number };
  latency_ms: number;
  interactionId: string;
}

export class VoiceAgentBridge extends EventEmitter {
  private opts: VoiceAgentBridgeOptions;
  private orchestrator: AudioOrchestrator;
  private chapterResolver: ChapterIndexResolver;
  private interactionId = 0;
  private currentAbortController?: AbortController;

  constructor(opts: VoiceAgentBridgeOptions) {
    super();
    this.opts = opts;
    this.orchestrator = opts.orchestrator || new AudioOrchestrator();
    this.chapterResolver = opts.chapterResolver || new ChapterIndexResolver();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Vapi events
    this.opts.vapi.on('final', async (text: string) => {
      console.log(`[VoiceAgentBridge] Final transcript: "${text}"`);
      await this.processQuestion(text);
    });

    this.opts.vapi.on('partial', (text: string) => {
      console.log(`[VoiceAgentBridge] Partial transcript: "${text}"`);
      this.emit('partial', { text });
    });

    this.opts.vapi.on('wakeWordDetected', (detection) => {
      console.log(`[VoiceAgentBridge] Wake word detected: ${detection.phrase}`);
      this.emit('wakeWordDetected', detection);
    });

    // TTS events from orchestrator
    this.orchestrator.on('ttsRequested', async ({ interactionId, text, voiceProfile, abortSignal }) => {
      try {
        await this.opts.audio.playTTS(interactionId, text, voiceProfile);
        this.orchestrator.onTTSComplete(interactionId);
      } catch (error) {
        this.orchestrator.onTTSError(interactionId, error as Error);
      }
    });

    // Background audio events
    this.orchestrator.on('pauseBackgroundAudio', (interactionId) => {
      console.log(`[VoiceAgentBridge] Pause request: ${interactionId}`);
      this.emit('pauseBackgroundAudio', interactionId);
    });

    this.orchestrator.on('resumeBackgroundAudio', ({ interactionId }) => {
      console.log(`[VoiceAgentBridge] Resume request: ${interactionId}`);
      this.emit('resumeBackgroundAudio', interactionId);
    });

    // Orchestrator events
    this.orchestrator.on('bargeIn', ({ previousId, newId }) => {
      console.log(`[VoiceAgentBridge] Barge-in: ${previousId} → ${newId}`);
      this.emit('bargeIn', { previousId, newId });
    });

    this.orchestrator.on('interactionStarted', (interaction) => {
      this.emit('interactionStarted', interaction);
    });

    this.orchestrator.on('interactionEnded', (result) => {
      this.emit('interactionEnded', result);
    });
  }

  async initialize(): Promise<void> {
    console.log('[VoiceAgentBridge] Initializing voice agent bridge...');

    await Promise.all([
      this.opts.vapi.initialize(),
      this.opts.tts.initialize(),
      this.opts.audio.initialize()
    ]);

    this.wireVapiEvents();
    
    console.log('[VoiceAgentBridge] Voice agent bridge ready');
    this.emit('ready');
  }

  private wireVapiEvents(): void {
    // Vapi events are already wired in setupEventListeners
    console.log('[VoiceAgentBridge] Vapi events wired');
  }

  async processQuestion(text: string): Promise<QAResult> {
    const id = ++this.interactionId;
    const interactionId = `voice_qa_${id}`;

    console.log(`[VoiceAgentBridge] Processing question ${interactionId}: "${text}"`);

    // Barge-in: cancel any in-flight operations
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.currentAbortController = new AbortController();

    // Begin interaction (pause/duck audio)
    await this.orchestrator.beginInteraction(interactionId);

    try {
      // Resolve current chapter and apply spoiler protection
      const playbackIdx = this.opts.context.playbackChapterIdx ?? 
        await this.chapterResolver.resolveFromPosition(
          this.opts.context.datasetPath, 
          this.opts.context.currentPosition_s
        );
      
      const allowedIdx = this.chapterResolver.allowedIdx(
        playbackIdx, 
        this.opts.context.userProgressIdx
      );

      console.log(`[VoiceAgentBridge] Chapter resolution: playback=${playbackIdx}, allowed=${allowedIdx}`);

      // Update orchestrator state
      this.orchestrator.updateInteractionState(interactionId, 'qa', { question: text });

      // Run LangGraph QA
      const t0 = performance.now();
      const result = await this.opts.runner.ask({
        datasetPath: this.opts.context.datasetPath,
        audiobookId: this.opts.context.audiobookId,
        question: text,
        playbackChapterIdx: allowedIdx,
        userProgressIdx: this.opts.context.userProgressIdx,
        modeHint: this.opts.context.modeHint ?? "auto",
        tokenBudget: 180000,
        signal: this.currentAbortController.signal
      });

      const latency = Math.round(performance.now() - t0);
      console.log(`[VoiceAgentBridge] QA completed in ${latency}ms`);

      // Clean markdown formatting for natural speech
      const cleanText = result.answer_markdown
        .replace(/\*\*/g, '') // Remove bold formatting
        .replace(/\*/g, '') // Remove italic formatting
        .replace(/#+\s*/g, '') // Remove header formatting
        .replace(/^-\s*/gm, '') // Remove bullet points
        .replace(/`/g, '') // Remove code formatting
        .replace(/\n{2,}/g, '\n') // Replace multiple newlines with single
        .trim();

      console.log(`[VoiceAgentBridge] Cleaned response for TTS: "${cleanText}"`);

      // Play TTS response with cleaned text
      await this.orchestrator.playTTS(interactionId, cleanText, "narrator");

      // Handle optional seek hint
      if (result.playbackHint?.start_s != null) {
        console.log(`[VoiceAgentBridge] Seek hint: ${result.playbackHint.start_s}s`);
        // Delay seek until after TTS completes
        this.orchestrator.once('ttsCompleted', () => {
          if (result.playbackHint?.start_s != null) {
            this.emit('seekRequested', result.playbackHint.start_s);
          }
        });
      }

      // End interaction (resume background audio)
      await this.orchestrator.endInteraction(interactionId);

      const qaResult: QAResult = {
        markdown: cleanText, // Use cleaned text instead of raw markdown
        citations: result.citations ?? [],
        playbackHint: result.playbackHint,
        latency_ms: latency,
        interactionId
      };

      console.log(`[VoiceAgentBridge] Question processed successfully: ${interactionId}`);
      this.emit('questionProcessed', qaResult);

      return qaResult;

    } catch (error) {
      console.error(`[VoiceAgentBridge] Question processing failed: ${interactionId}`, error);
      
      // End interaction on error
      await this.orchestrator.endInteraction(interactionId);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('questionError', { interactionId, error: errorMessage, text });
      
      throw error;
    } finally {
      this.currentAbortController = undefined;
    }
  }

  async startListening(): Promise<void> {
    console.log('[VoiceAgentBridge] Starting voice listening...');
    await this.opts.vapi.startListening();
    this.emit('listeningStarted');
  }

  async stopListening(): Promise<void> {
    console.log('[VoiceAgentBridge] Stopping voice listening...');
    
    // Cancel any ongoing processing
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }

    // Stop all orchestrated interactions
    await this.orchestrator.stopAll();

    // Stop voice recognition
    await this.opts.vapi.stopListening();
    
    this.emit('listeningStopped');
  }

  async startWakeWordListening(): Promise<void> {
    console.log('[VoiceAgentBridge] Starting wake word listening...');
    await this.opts.vapi.startWakeWordListening();
    this.emit('wakeWordListeningStarted');
  }

  updateContext(context: Partial<VoiceContext>): void {
    this.opts.context = { ...this.opts.context, ...context };
    console.log(`[VoiceAgentBridge] Context updated:`, context);
    this.emit('contextUpdated', this.opts.context);
  }

  getCurrentContext(): VoiceContext {
    return { ...this.opts.context };
  }

  getOrchestratorStats() {
    return this.orchestrator.getStats();
  }

  getChapterInfo(): {
    currentChapter: number;
    allowedChapter: number;
    position: number;
  } {
    const playbackIdx = this.opts.context.playbackChapterIdx ?? 1;
    const allowedIdx = this.chapterResolver.allowedIdx(
      playbackIdx,
      this.opts.context.userProgressIdx
    );

    return {
      currentChapter: playbackIdx,
      allowedChapter: allowedIdx,
      position: this.opts.context.currentPosition_s
    };
  }

  async testConnection(): Promise<{ stt: boolean; tts: boolean; qa: boolean }> {
    console.log('[VoiceAgentBridge] Testing connections...');

    const results = {
      stt: false,
      tts: false,
      qa: false
    };

    try {
      // Test STT
      results.stt = this.opts.vapi.isConnected;
      
      // Test TTS
      const testTTS = await this.opts.tts.synthesizeText("Test", { priority: 'normal' });
      results.tts = testTTS.audioStream !== null;
      testTTS.audioStream.destroy();

      // Test QA
      results.qa = await this.opts.runner.test(this.opts.context.datasetPath);

    } catch (error) {
      console.error('[VoiceAgentBridge] Connection test failed:', error);
    }

    console.log('[VoiceAgentBridge] Connection test results:', results);
    return results;
  }

  async destroy(): Promise<void> {
    console.log('[VoiceAgentBridge] Destroying voice agent bridge...');

    // Stop all operations
    await this.stopListening();

    // Clean up services
    await Promise.all([
      this.opts.vapi.destroy(),
      this.opts.tts.destroy(),
      this.opts.audio.destroy()
    ]);

    // Clean up chapter resolver cache
    this.chapterResolver.clearCache();

    this.removeAllListeners();
    this.orchestrator.removeAllListeners();
    
    console.log('[VoiceAgentBridge] Voice agent bridge destroyed');
  }
}