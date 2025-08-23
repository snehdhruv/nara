const VAPI_API_KEY = '765f8644-1464-4b36-a4fe-c660e15ba313';
const ASSISTANT_ID = '73c59df7-34d0-4e5a-89b0-d0668982c8cc';

async function checkVapiAssistant() {
  try {
    console.log(`🔍 Checking Vapi assistant: ${ASSISTANT_ID}`);
    console.log('');

    const response = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error ${response.status}: ${errorText}`);
      return;
    }

    const assistant = await response.json();

    console.log('✅ ASSISTANT CONFIGURATION FOUND!');
    console.log('═══════════════════════════════════════════════');
    console.log(`📝 Name: ${assistant.name || 'Unnamed Assistant'}`);
    console.log(`🆔 ID: ${assistant.id}`);
    console.log('');

    // Model Configuration
    console.log('🧠 MODEL:');
    if (assistant.model) {
      console.log(`   Provider: ${assistant.model.provider || 'Unknown'}`);
      console.log(`   Model: ${assistant.model.model || 'Unknown'}`);
      console.log(`   Temperature: ${assistant.model.temperature || 'Default'}`);
      console.log(`   Max Tokens: ${assistant.model.maxTokens || 'Default'}`);

      if (assistant.model.systemMessage) {
        console.log(`   System Message: "${assistant.model.systemMessage.substring(0, 200)}${assistant.model.systemMessage.length > 200 ? '...' : ''}"`);
      }
    }
    console.log('');

    // Voice Configuration
    console.log('🗣️ VOICE:');
    if (assistant.voice) {
      console.log(`   Provider: ${assistant.voice.provider || 'Unknown'}`);
      console.log(`   Voice ID: ${assistant.voice.voiceId || 'Unknown'}`);
      console.log(`   Stability: ${assistant.voice.stability || 'Default'}`);
      console.log(`   Similarity Boost: ${assistant.voice.similarityBoost || 'Default'}`);
    }
    console.log('');

    // Transcriber Configuration
    console.log('🎤 TRANSCRIBER:');
    if (assistant.transcriber) {
      console.log(`   Provider: ${assistant.transcriber.provider || 'Unknown'}`);
      console.log(`   Model: ${assistant.transcriber.model || 'Unknown'}`);
      console.log(`   Language: ${assistant.transcriber.language || 'Default'}`);
    }
    console.log('');

    // Conversation Settings
    console.log('💬 CONVERSATION:');
    console.log(`   First Message Mode: ${assistant.firstMessageMode || 'Unknown'}`);
    console.log(`   Response Delay: ${assistant.responseDelaySeconds || 'Default'}s`);
    console.log('');

    // Analysis
    const hasVoice = assistant.voice?.provider;
    const hasTranscriber = assistant.transcriber?.provider;
    const isConversational = !assistant.model?.systemMessage?.toLowerCase().includes('silent');

    console.log('🔍 ANALYSIS:');
    console.log(`   Speech Input (STT): ${hasTranscriber ? '✅ YES' : '❌ NO'}`);
    console.log(`   Speech Output (TTS): ${hasVoice ? '✅ YES' : '❌ NO'}`);
    console.log(`   Conversational AI: ${isConversational ? '✅ YES' : '❌ NO (Silent/STT-only)'}`);
    console.log('');

    console.log('🎯 RECOMMENDATION:');
    if (hasVoice && hasTranscriber && isConversational) {
      console.log('   🚀 PERFECT! This assistant is ready for END-TO-END conversations!');
      console.log('   ✅ You can use this for full speech-to-speech audiobook discussions.');
      console.log('   ✅ Just update your config.ts with this assistant ID and start talking!');
    } else if (hasTranscriber && !hasVoice) {
      console.log('   ⚠️  This is STT-only (no voice output)');
      console.log('   💡 Good for transcription, but you\'ll need TTS separately');
    } else if (!hasTranscriber && hasVoice) {
      console.log('   ⚠️  This is TTS-only (no speech input)');
      console.log('   💡 Good for voice output, but you\'ll need STT separately');
    } else {
      console.log('   ❌ This assistant needs configuration for speech capabilities');
    }

    return assistant;

  } catch (error) {
    console.error('❌ Failed to check assistant:', error.message);
    console.error('💡 Make sure your API key is correct and the assistant ID exists');
  }
}

checkVapiAssistant();
