import type { GraphState } from '../types';
import { SYSTEM_NOTES } from '../prompts';
import { getLLMClient } from '../llm-client';

export async function noteTakerNode(params: { transcript: string }): Promise<string> {
  console.log('[NoteTaker] Generating notes from transcript');
  
  const llm = getLLMClient();
  
  try {
    const notes = await llm.complete({
      system: SYSTEM_NOTES,
      messages: [{
        role: 'user',
        content: params.transcript
      }]
    });
    
    console.log('[NoteTaker] Generated notes');
    return notes;
  } catch (error) {
    console.log('[NoteTaker] Failed to generate notes:', error);
    return 'Unable to generate notes at this time.';
  }
}