/**
 * AudioOrchestrator - State machine for audio interactions
 * Manages pause/duck/resume flow and TTS playback with barge-in support
 */

import { EventEmitter } from 'events';

export type AudioInteractionState = 'idle' | 'stt' | 'qa' | 'tts';

export interface AudioInteraction {
  id: string;
  state: AudioInteractionState;
  startTime: number;
  isActive: boolean;
  metadata?: {
    question?: string;
    answer?: string;
    voiceProfile?: string;
  };
}

export interface AudioOrchestrationOptions {
  pauseBackgroundOnInteraction?: boolean;
  duckVolumeLevel?: number; // 0-1, volume level when ducking
  resumeDelay?: number; // ms delay before resuming background audio
  maxConcurrentInteractions?: number;
}

export class AudioOrchestrator extends EventEmitter {
  private options: Required<AudioOrchestrationOptions>;
  private currentInteraction: AudioInteraction | null = null;
  private interactionHistory: AudioInteraction[] = [];
  private interactionCounter = 0;
  private currentTTSController: AbortController | null = null;

  constructor(options: AudioOrchestrationOptions = {}) {
    super();
    
    this.options = {
      pauseBackgroundOnInteraction: true,
      duckVolumeLevel: 0.3,
      resumeDelay: 500,
      maxConcurrentInteractions: 1,
      ...options
    };
  }

  /**
   * Begin a new audio interaction
   * Pauses/ducks background audio and returns interaction ID
   */
  async beginInteraction(id?: string): Promise<string> {
    const interactionId = id || `interaction_${++this.interactionCounter}`;
    
    console.log(`[AudioOrchestrator] Beginning interaction: ${interactionId}`);

    // Cancel any existing interaction (barge-in)
    if (this.currentInteraction) {
      await this.bargeIn(interactionId);
    }

    // Create new interaction
    const interaction: AudioInteraction = {
      id: interactionId,
      state: 'stt',
      startTime: Date.now(),
      isActive: true,
      metadata: {}
    };

    this.currentInteraction = interaction;
    this.interactionHistory.push(interaction);

    // Manage background audio
    if (this.options.pauseBackgroundOnInteraction) {
      console.log(`[AudioOrchestrator] Pausing background audio for ${interactionId}`);
      this.emit('pauseBackgroundAudio', interactionId);
    } else {
      console.log(`[AudioOrchestrator] Ducking background audio for ${interactionId}`);
      this.emit('duckBackgroundAudio', {
        interactionId,
        volumeLevel: this.options.duckVolumeLevel
      });
    }

    this.emit('interactionStarted', interaction);
    return interactionId;
  }

  /**
   * Update interaction state
   */
  updateInteractionState(id: string, state: AudioInteractionState, metadata?: any): void {
    if (!this.currentInteraction || this.currentInteraction.id !== id) {
      console.warn(`[AudioOrchestrator] Cannot update state - interaction ${id} not current`);
      return;
    }

    console.log(`[AudioOrchestrator] ${id}: ${this.currentInteraction.state} → ${state}`);
    
    this.currentInteraction.state = state;
    if (metadata) {
      this.currentInteraction.metadata = { ...this.currentInteraction.metadata, ...metadata };
    }

    this.emit('interactionStateChanged', {
      id,
      state,
      previousState: this.currentInteraction.state,
      metadata: this.currentInteraction.metadata
    });
  }

  /**
   * Play TTS for the current interaction with barge-in support
   */
  async playTTS(id: string, text: string, voiceProfile?: string): Promise<void> {
    if (!this.currentInteraction || this.currentInteraction.id !== id) {
      console.warn(`[AudioOrchestrator] Cannot play TTS - interaction ${id} not current`);
      return;
    }

    console.log(`[AudioOrchestrator] Playing TTS for ${id}: "${text.substring(0, 50)}..."`);

    // Update state
    this.updateInteractionState(id, 'tts', { answer: text, voiceProfile });

    // Cancel any existing TTS
    if (this.currentTTSController) {
      this.currentTTSController.abort();
    }

    // Create new abort controller for this TTS
    this.currentTTSController = new AbortController();

    try {
      // Emit TTS request with abort controller
      this.emit('ttsRequested', {
        interactionId: id,
        text,
        voiceProfile,
        abortSignal: this.currentTTSController.signal
      });

      // TTS completion will be handled by listeners
      console.log(`[AudioOrchestrator] TTS started for ${id}`);

    } catch (error) {
      console.error(`[AudioOrchestrator] TTS failed for ${id}:`, error);
      this.emit('interactionError', { id, error, state: 'tts' });
    }
  }

  /**
   * Handle TTS completion
   */
  onTTSComplete(id: string): void {
    if (!this.currentInteraction || this.currentInteraction.id !== id) {
      return;
    }

    console.log(`[AudioOrchestrator] TTS completed for ${id}`);
    this.currentTTSController = null;
    this.emit('ttsCompleted', { id });
  }

  /**
   * Handle TTS error
   */
  onTTSError(id: string, error: Error): void {
    if (!this.currentInteraction || this.currentInteraction.id !== id) {
      return;
    }

    console.error(`[AudioOrchestrator] TTS error for ${id}:`, error);
    this.currentTTSController = null;
    this.emit('ttsError', { id, error });
  }

  /**
   * End the current interaction
   */
  async endInteraction(id: string): Promise<void> {
    if (!this.currentInteraction || this.currentInteraction.id !== id) {
      console.warn(`[AudioOrchestrator] Cannot end interaction - ${id} not current`);
      return;
    }

    console.log(`[AudioOrchestrator] Ending interaction: ${id}`);

    const interaction = this.currentInteraction;
    const duration = Date.now() - interaction.startTime;

    // Cancel any ongoing TTS
    if (this.currentTTSController) {
      this.currentTTSController.abort();
      this.currentTTSController = null;
    }

    // Mark interaction as completed
    interaction.isActive = false;
    this.currentInteraction = null;

    // Resume background audio immediately for testing (no delay)
    console.log(`[AudioOrchestrator] Resuming background audio after ${id}`);
    this.emit('resumeBackgroundAudio', { interactionId: id, duration });

    this.emit('interactionEnded', {
      id,
      duration,
      finalState: interaction.state,
      metadata: interaction.metadata
    });
  }

  /**
   * Handle barge-in - cancel current interaction and start new one
   */
  async bargeIn(newInteractionId: string): Promise<void> {
    if (!this.currentInteraction) {
      return;
    }

    const currentId = this.currentInteraction.id;
    console.log(`[AudioOrchestrator] Barge-in: ${currentId} → ${newInteractionId}`);

    // Cancel current TTS immediately
    if (this.currentTTSController) {
      this.currentTTSController.abort();
      this.currentTTSController = null;
    }

    // Mark current interaction as interrupted
    if (this.currentInteraction) {
      this.currentInteraction.isActive = false;
      this.emit('interactionInterrupted', {
        id: currentId,
        interruptedBy: newInteractionId,
        state: this.currentInteraction.state
      });
    }

    this.currentInteraction = null;

    this.emit('bargeIn', {
      previousId: currentId,
      newId: newInteractionId
    });
  }

  /**
   * Get current interaction status
   */
  getCurrentInteraction(): AudioInteraction | null {
    return this.currentInteraction ? { ...this.currentInteraction } : null;
  }

  /**
   * Get interaction history
   */
  getInteractionHistory(limit?: number): AudioInteraction[] {
    const history = [...this.interactionHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Check if currently processing an interaction
   */
  isActive(): boolean {
    return this.currentInteraction !== null;
  }

  /**
   * Get current state
   */
  getCurrentState(): AudioInteractionState {
    return this.currentInteraction?.state ?? 'idle';
  }

  /**
   * Force stop all interactions
   */
  async stopAll(): Promise<void> {
    console.log('[AudioOrchestrator] Stopping all interactions');

    if (this.currentTTSController) {
      this.currentTTSController.abort();
      this.currentTTSController = null;
    }

    if (this.currentInteraction) {
      const id = this.currentInteraction.id;
      this.currentInteraction.isActive = false;
      this.currentInteraction = null;

      this.emit('allInteractionsStopped');
      this.emit('resumeBackgroundAudio', { interactionId: id, forced: true });
    }
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): {
    totalInteractions: number;
    currentInteraction: string | null;
    averageInteractionDuration: number;
    activeInteractions: number;
  } {
    const completedInteractions = this.interactionHistory.filter(i => !i.isActive);
    const totalDuration = completedInteractions.reduce(
      (sum, interaction) => sum + (Date.now() - interaction.startTime), 
      0
    );

    return {
      totalInteractions: this.interactionHistory.length,
      currentInteraction: this.currentInteraction?.id ?? null,
      averageInteractionDuration: completedInteractions.length > 0 
        ? Math.round(totalDuration / completedInteractions.length) 
        : 0,
      activeInteractions: this.currentInteraction ? 1 : 0
    };
  }

  /**
   * Clear interaction history (for memory management)
   */
  clearHistory(): void {
    this.interactionHistory = this.interactionHistory.filter(i => i.isActive);
    this.emit('historyCleared');
  }
}