#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ingestVideo, ingestBatch } from './index';
import { readLinesFromFile } from './util';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env file
config({ path: path.resolve(process.cwd(), '.env') });

const DEFAULT_OUTPUT_DIR = path.join(__dirname, '..', 'out');

yargs(hideBin(process.argv))
  .command(
    'fetch',
    'Fetch and process YouTube video(s)',
    (yargs) => {
      return yargs
        .option('url', {
          type: 'string',
          array: true,
          description: 'YouTube URL(s) or video ID(s)'
        })
        .option('file', {
          type: 'string',
          description: 'File containing URLs (one per line)'
        })
        .option('lang', {
          type: 'string',
          default: 'en',
          description: 'Language code for captions'
        })
        .option('fallback-auto', {
          type: 'boolean',
          default: false,
          description: 'Use auto-generated captions if human captions unavailable'
        })
        .option('min-paragraph-sentences', {
          type: 'number',
          default: 2,
          description: 'Minimum sentences per paragraph'
        })
        .option('max-paragraph-sentences', {
          type: 'number',
          default: 4,
          description: 'Maximum sentences per paragraph'
        })
        .option('out', {
          type: 'string',
          default: DEFAULT_OUTPUT_DIR,
          description: 'Output directory'
        })
        .option('title', {
          type: 'string',
          description: 'Override video title'
        })
        .option('license', {
          type: 'string',
          choices: ['owner_ok', 'licensed', 'public_domain'],
          default: 'owner_ok',
          description: 'Rights/license status'
        })
        .check((argv) => {
          if (!argv.url && !argv.file) {
            throw new Error('Must provide either --url or --file');
          }
          if (argv.url && argv.file) {
            throw new Error('Cannot use both --url and --file');
          }
          return true;
        });
    },
    async (argv) => {
      try {
        let urls: string[] = [];
        
        if (argv.url) {
          urls = Array.isArray(argv.url) ? argv.url : [argv.url];
        } else if (argv.file) {
          urls = await readLinesFromFile(argv.file);
        }
        
        if (urls.length === 0) {
          console.error('No URLs provided');
          process.exit(1);
        }
        
        const options = {
          lang: argv.lang,
          fallbackAuto: argv['fallback-auto'],
          minParagraphSentences: argv['min-paragraph-sentences'],
          maxParagraphSentences: argv['max-paragraph-sentences'],
          outputDir: argv.out,
          title: argv.title,
          rights: argv.license as 'owner_ok' | 'licensed' | 'public_domain'
        };
        
        if (urls.length === 1) {
          await ingestVideo({ ...options, urlOrId: urls[0] });
        } else {
          const results = await ingestBatch(urls, options);
          
          console.log('\n=== Summary ===');
          let successCount = 0;
          let failureCount = 0;
          
          for (const [url, result] of results) {
            if (result instanceof Error) {
              console.error(`❌ ${url}: ${result.message}`);
              failureCount++;
            } else {
              console.log(`✅ ${url}: ${result.source.video_id}.json`);
              successCount++;
            }
          }
          
          console.log(`\nProcessed: ${successCount} success, ${failureCount} failures`);
        }
      } catch (error: any) {
        console.error('Error:', error.message);
        process.exit(1);
      }
    }
  )
  .demandCommand(1, 'You need at least one command')
  .help()
  .argv;