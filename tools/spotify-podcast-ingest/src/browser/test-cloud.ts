#!/usr/bin/env node

import { extractJoeRoganQueriesCloud } from './browseruse-cloud.js';
import { log, error } from '../util/log.js';

async function main() {
  try {
    log('🚀 Starting Spotify GraphQL extraction with Browser Use Cloud...');
    await extractJoeRoganQueriesCloud();
    log('✅ Extraction completed!');
  } catch (err: any) {
    error(`Extraction failed: ${err.message}`);
    process.exit(1);
  }
}

main();