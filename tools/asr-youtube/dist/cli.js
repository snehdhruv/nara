#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { transcribeYouTubeVideo } from './index.js';
import { error, log } from './util/log.js';
import { config } from 'dotenv';
import { resolve } from 'path';
// Load environment variables
config({ path: resolve(process.cwd(), '.env') });
const argv = await yargs(hideBin(process.argv))
    .command('transcribe', 'Transcribe a YouTube video using OpenAI Whisper', {
    url: {
        alias: 'u',
        type: 'string',
        demandOption: true,
        description: 'YouTube video URL or video ID'
    },
    lang: {
        alias: 'l',
        type: 'string',
        default: 'en',
        description: 'Language for transcription'
    },
    'paragraph-min': {
        type: 'number',
        default: 2,
        description: 'Minimum sentences per paragraph'
    },
    'paragraph-max': {
        type: 'number',
        default: 4,
        description: 'Maximum sentences per paragraph'
    },
    out: {
        alias: 'o',
        type: 'string',
        default: './out',
        description: 'Output directory'
    },
    title: {
        alias: 't',
        type: 'string',
        description: 'Override video title'
    },
    rights: {
        type: 'string',
        default: 'owner_ok',
        description: 'Rights information'
    },
    vtt: {
        type: 'boolean',
        default: false,
        description: 'Generate WebVTT subtitle file'
    },
    srt: {
        type: 'boolean',
        default: false,
        description: 'Generate SubRip subtitle file'
    },
    'asr-model': {
        type: 'string',
        default: 'whisper-1',
        description: 'OpenAI Whisper model to use'
    },
    'use-dedalus': {
        type: 'boolean',
        default: process.env.USE_DEDALUS_ROUTING === 'true',
        description: 'Use Dedalus routing for transcription'
    }
})
    .demandCommand(1, 'You must specify a command')
    .help()
    .argv;
async function main() {
    // Validate environment
    const useDedalus = argv['use-dedalus'];
    if (useDedalus && !process.env.DEDALUS_API_KEY) {
        error('DEDALUS_API_KEY environment variable is required when using Dedalus routing');
        error('Please set it in your .env file or use --no-use-dedalus flag');
        process.exit(1);
    }
    if (!useDedalus && !process.env.OPENAI_API_KEY) {
        error('OPENAI_API_KEY environment variable is required');
        error('Please set it in your .env file or environment');
        process.exit(1);
    }
    const command = argv._[0];
    try {
        if (command === 'transcribe') {
            const options = {
                url: argv.url,
                lang: argv.lang,
                paragraphMin: argv['paragraph-min'],
                paragraphMax: argv['paragraph-max'],
                out: argv.out,
                title: argv.title,
                rights: argv.rights,
                vtt: argv.vtt,
                srt: argv.srt,
                asrModel: argv['asr-model'],
                useDedalus: argv['use-dedalus']
            };
            log(`Starting transcription with options:`, options);
            const result = await transcribeYouTubeVideo(options);
            log('📊 Final Summary:');
            log(`  Video ID: ${result.videoId}`);
            log(`  Duration: ${Math.round(result.duration / 60)} minutes`);
            log(`  Chapters: ${result.chapters}`);
            log(`  Segments: ${result.segments}`);
            log(`  Paragraphs: ${result.paragraphs}`);
            log(`  Output: ${result.jsonPath}`);
        }
        else {
            error(`Unknown command: ${command}`);
            process.exit(1);
        }
    }
    catch (err) {
        error(`Command failed: ${err.message}`);
        if (err.stack) {
            console.error(err.stack);
        }
        process.exit(1);
    }
}
main();
