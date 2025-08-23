import Dedalus from 'dedalus-labs';
import { log, progress, error } from '../util/log.js';
export class DedalusTranscriptionClient {
    client;
    constructor(apiKey) {
        // Use Dedalus API key or fallback to environment
        const dedalusKey = apiKey || process.env.DEDALUS_API_KEY;
        if (!dedalusKey) {
            throw new Error('DEDALUS_API_KEY environment variable is required');
        }
        this.client = new Dedalus({
            apiKey: dedalusKey
        });
        log('Dedalus client initialized with default base URL');
    }
    /**
     * Transcribe audio using Dedalus with MCP servers for proper transcription capabilities
     */
    async transcribeAudio(options) {
        const { audioPath, language = 'en', model = ['whisper-1'], fallbackModels = [] } = options;
        progress(`Starting Dedalus transcription with Whisper model: ${model[0]}`);
        try {
            // Use OpenAI Whisper API format through Dedalus
            // Read the audio file for multipart/form-data upload
            const fs = await import('fs');
            const path = await import('path');
            if (!fs.existsSync(audioPath)) {
                throw new Error(`Audio file not found: ${audioPath}`);
            }
            const audioBuffer = fs.readFileSync(audioPath);
            const fileName = path.basename(audioPath);
            log(`Reading audio file: ${fileName} (${audioBuffer.length} bytes)`);
            // Create multipart/form-data request for Whisper API using built-in FormData
            const formData = new FormData();
            // Add the audio file as Blob
            const audioBlob = new Blob([audioBuffer], {
                type: this.getAudioContentType(fileName)
            });
            formData.append('file', audioBlob, fileName);
            // Add other Whisper API parameters
            formData.append('model', model[0] || 'whisper-1');
            formData.append('language', language);
            formData.append('response_format', 'verbose_json');
            formData.append('timestamp_granularities[]', 'segment');
            log('Making Dedalus Whisper API request...');
            // Use the correct OpenAI Whisper endpoint through Dedalus
            const response = await fetch('https://api.dedaluslabs.ai/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.DEDALUS_API_KEY}`
                    // Note: Don't set Content-Type header, let browser set it with boundary
                },
                body: formData
            });
            if (!response.ok) {
                const errorText = await response.text();
                error(`Dedalus Whisper API error: ${response.status} ${response.statusText}\n${errorText}`);
                throw new Error(`Dedalus Whisper API error: ${response.status} ${response.statusText}\n${errorText}`);
            }
            const transcriptionResult = await response.json();
            log(`Dedalus transcription completed successfully`);
            // Convert OpenAI Whisper format to our format
            if (transcriptionResult.segments && Array.isArray(transcriptionResult.segments)) {
                const segments = transcriptionResult.segments.map((seg) => ({
                    start_s: this.roundToDecimals(seg.start),
                    end_s: this.roundToDecimals(seg.end),
                    text: seg.text.trim()
                }));
                log(`Successfully extracted ${segments.length} segments from Dedalus Whisper response`);
                return segments;
            }
            else {
                // Fallback: create single segment from the full text
                const fullText = transcriptionResult.text || 'No transcription available';
                return [{
                        start_s: 0,
                        end_s: 300, // Estimate 5 minutes
                        text: fullText.trim()
                    }];
            }
        }
        catch (err) {
            error(`Dedalus transcription failed: ${err.message}`);
            throw new Error(`Dedalus transcription failed: ${err.message}`);
        }
    }
    /**
     * Get the appropriate content type for audio files
     */
    getAudioContentType(filename) {
        const ext = filename.toLowerCase().split('.').pop();
        switch (ext) {
            case 'mp3': return 'audio/mpeg';
            case 'wav': return 'audio/wav';
            case 'm4a': return 'audio/m4a';
            case 'ogg': return 'audio/ogg';
            case 'flac': return 'audio/flac';
            default: return 'audio/mpeg'; // Default to mp3
        }
    }
    /**
     * Parse transcription response and extract segment data
     */
    parseTranscriptionResponse(responseText) {
        try {
            // Look for JSON array in the response
            const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
            if (!jsonMatch) {
                return null;
            }
            const parsed = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(parsed)) {
                return null;
            }
            // Validate and convert segments
            return parsed.map((seg, index) => {
                if (typeof seg.start_s !== 'number' || typeof seg.end_s !== 'number' || typeof seg.text !== 'string') {
                    throw new Error(`Invalid segment format at index ${index}`);
                }
                return {
                    start_s: this.roundToDecimals(seg.start_s),
                    end_s: this.roundToDecimals(seg.end_s),
                    text: seg.text.trim()
                };
            });
        }
        catch (parseErr) {
            // If JSON parsing fails, return null to trigger text-based segment generation
            return null;
        }
    }
    /**
     * Generate basic segments when Dedalus returns text but not properly formatted segments
     */
    generateSegmentsFromText(text, audioPath) {
        // Split text into sentences and create estimated segments
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const estimatedDuration = 300; // Assume 5 minutes for estimation
        const segmentDuration = estimatedDuration / sentences.length;
        return sentences.map((sentence, index) => ({
            start_s: this.roundToDecimals(index * segmentDuration),
            end_s: this.roundToDecimals((index + 1) * segmentDuration),
            text: sentence.trim()
        }));
    }
    roundToDecimals(num, decimals = 2) {
        return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
}
