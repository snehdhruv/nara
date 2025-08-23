#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ingestSpotifyPodcast } from './index.js';
import { extractShowId } from './auth.js';
import { error, log } from './util/log.js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const argv = await yargs(hideBin(process.argv))
  .command('fetch', 'Fetch and process Spotify podcast episodes', {
    show: {
      alias: 's',
      type: 'string',
      demandOption: true,
      description: 'Spotify show URL or show ID'
    },
    auth: {
      alias: 'a',
      type: 'string',
      description: 'Bearer token (overrides env and headers file)'
    },
    headers: {
      type: 'string',
      description: 'Path to JSON file with headers from browser DevTools'
    },
    market: {
      type: 'string',
      default: 'US',
      description: 'Market/country code'
    },
    lang: {
      alias: 'l',
      type: 'string',
      default: 'en',
      description: 'Language code'
    },
    'max-episodes': {
      type: 'number',
      default: 100,
      description: 'Maximum episodes to fetch'
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
    vtt: {
      type: 'boolean',
      default: false,
      description: 'Generate WebVTT subtitle files'
    },
    srt: {
      type: 'boolean',
      default: false,
      description: 'Generate SubRip subtitle files'
    }
  })
  .demandCommand(1, 'You must specify a command')
  .help()
  .example('$0 fetch --show https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk --auth "Bearer abc123" --market US --max-episodes 50 --vtt --srt', 'Fetch first 50 episodes with subtitles')
  .example('$0 fetch --show 4rOoJ6Egrf8K2IrywzwOMk --headers ./headers.json --lang en', 'Fetch using browser headers')
  .argv;

async function main() {
  const command = argv._[0] as string;

  try {
    if (command === 'fetch') {
      // Validate show input
      const showId = extractShowId(argv.show as string);
      
      // Use auth from CLI args, env vars, or headers file
      const bearerToken = (argv.auth as string) || process.env.SPOTIFY_BEARER_TOKEN;
      const headersFile = (argv.headers as string) || process.env.SPOTIFY_HEADERS_FILE;
      
      if (!bearerToken && !headersFile) {
        error('Authentication required. Use --auth "Bearer <token>" or --headers <file> or set SPOTIFY_BEARER_TOKEN env var');
        error('To get headers: Open Spotify Web Player → DevTools → Network → Copy request as cURL → extract headers to JSON');
        process.exit(1);
      }

      const options = {
        showId,
        bearerToken,
        headersFile,
        market: argv.market as string,
        lang: argv.lang as string,
        maxEpisodes: argv['max-episodes'] as number,
        paragraphMin: argv['paragraph-min'] as number,
        paragraphMax: argv['paragraph-max'] as number,
        out: argv.out as string,
        vtt: argv.vtt as boolean,
        srt: argv.srt as boolean
      };

      log('Starting Spotify podcast ingest with options:', options);
      
      const result = await ingestSpotifyPodcast(options);
      
      log('📊 Final Summary:');
      log(`  Episodes processed: ${result.processed}`);
      log(`  Successful: ${result.successful}`);
      log(`  Failed: ${result.failed}`);
      log(`  Output directory: ${result.outputDir}`);
      
      if (result.failed > 0) {
        process.exit(1);
      }
      
    } else {
      error(`Unknown command: ${command}`);
      process.exit(1);
    }

  } catch (err: any) {
    error(`Command failed: ${err.message}`);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();