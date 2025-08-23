#!/usr/bin/env node

import { extractJoeRoganQueries, extractQueriesForShow } from './extract-queries.js';
import { log, error } from '../util/log.js';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    log('Usage: tsx src/browser/cli.ts [show-id|joe-rogan]');
    log('Examples:');
    log('  tsx src/browser/cli.ts joe-rogan');
    log('  tsx src/browser/cli.ts 4rOoJ6Egrf8K2IrywzwOMk');
    process.exit(1);
  }
  
  const target = args[0];
  
  try {
    let queries;
    
    if (target === 'joe-rogan') {
      log('🎙️ Extracting queries from Joe Rogan Experience...');
      queries = await extractJoeRoganQueries();
    } else {
      log(`🎙️ Extracting queries from show: ${target}`);
      queries = await extractQueriesForShow(target);
    }
    
    log(`\n📊 Extraction Summary:`);
    log(`  Total queries captured: ${queries.length}`);
    
    const operationCounts = queries.reduce((acc, q) => {
      acc[q.operationName] = (acc[q.operationName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    log(`  Operations found:`);
    Object.entries(operationCounts).forEach(([op, count]) => {
      log(`    - ${op}: ${count} times`);
    });
    
    // Show unique hashes found
    const hashes = queries
      .map(q => q.extensions?.persistedQuery?.sha256Hash)
      .filter(Boolean);
    
    if (hashes.length > 0) {
      log(`  Unique SHA256 hashes: ${new Set(hashes).size}`);
      log(`  Sample hashes:`);
      [...new Set(hashes)].slice(0, 3).forEach(hash => {
        log(`    - ${hash}`);
      });
    }
    
  } catch (err: any) {
    error(`Extraction failed: ${err.message}`);
    process.exit(1);
  }
}

main();