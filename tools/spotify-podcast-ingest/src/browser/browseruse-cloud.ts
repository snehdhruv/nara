import { request } from 'undici';
import { log, error, success, warn } from '../util/log.js';
import { writeFile } from 'fs/promises';

const BROWSER_USE_API_KEY = 'bu_PP8-aT8Yc1zKzVrV0pBoenVjfZvcqOF5EZbDVEwps0k';
const BROWSER_USE_API_BASE = 'https://api.browser-use.com/api/v1';

interface TaskResponse {
  task_id: string;
  session_id: string;
  status: string;
  result?: any;
  error?: string;
}

export async function extractSpotifyQueriesWithBrowserUse(showId: string): Promise<void> {
  log('🌐 Using Browser Use Cloud API to extract Spotify GraphQL queries...');
  
  const taskDescription = `
  Go to https://open.spotify.com/show/${showId} (Joe Rogan podcast).
  
  Your mission is to extract Spotify's internal GraphQL API data. Do the following:
  
  1. First, scroll down to load more episodes and wait for content to load
  
  2. Look at the page source (view source or inspect element) and search for embedded JSON data containing:
     - "operationName"
     - "sha256Hash" 
     - "pathfinder"
     - "persistedQuery"
     - Episode data with IDs and titles
  
  3. Execute JavaScript in the console to extract API data:
     - Run: Object.keys(window).filter(k => k.includes('spotify') || k.includes('api') || k.includes('graphql'))
     - Run: JSON.stringify(window.__SPOTIFY__ || window.webpackJsonp || window.__INITIAL_STATE__, null, 2)
     - Look for fetch() calls or XMLHttpRequest patterns in the page's scripts
  
  4. Search the page HTML for script tags containing:
     - GraphQL query hashes (64-character hex strings)
     - "api-partner.spotify.com/pathfinder" URLs
     - Episode JSON data with podcast information
  
  5. Create a comprehensive text file with ALL findings:
     - Any GraphQL operation names found
     - All sha256Hash values (these are crucial!)
     - Episode data structures
     - API endpoint patterns
     - JavaScript variables with Spotify data
  
  Focus on finding the actual GraphQL query hashes that Spotify uses internally. These will be 64-character hexadecimal strings.
  `;

  try {
    // Create task
    log('🔄 Creating Browser Use Cloud task...');
    const taskResponse = await request(`${BROWSER_USE_API_BASE}/run-task`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BROWSER_USE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        task: taskDescription,
        // Use default agent and browser profiles
        wait_for_completion: true,
        max_steps: 20
      })
    });

    if (taskResponse.statusCode !== 200) {
      const errorText = await taskResponse.body.text();
      throw new Error(`Browser Use API error (${taskResponse.statusCode}): ${errorText}`);
    }

    const result = await taskResponse.body.json() as any;
    
    log('📋 Full API response:', JSON.stringify(result, null, 2));
    
    const taskId = result.task_id || result.id || result.taskId;
    const sessionId = result.session_id || result.sessionId;
    
    log(`✅ Task created with ID: ${taskId || 'not provided'}`);
    log(`📱 Session ID: ${sessionId || 'not provided'}`);
    
    // Poll for task completion
    if (taskId) {
      log('🔄 Polling for task completion...');
      const finalResult = await pollTaskStatus(taskId);
      
      if (finalResult) {
        await processTaskResult(finalResult);
        return;
      }
    }
    
    if (result.status === 'completed') {
      success('🎉 Task completed successfully!');
      
      if (result.result) {
        // Save the result data
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `spotify-browseruse-result-${timestamp}.json`;
        await writeFile(filename, JSON.stringify(result.result, null, 2));
        log(`📁 Result saved to: ${filename}`);
        
        // Parse any GraphQL queries from the result
        await parseGraphQLQueries(result.result);
      }
    } else if (result.error) {
      error(`❌ Task failed: ${result.error}`);
    } else {
      warn(`⏳ Task status: ${result.status}`);
      log('You may need to check the task status manually or wait longer for completion.');
    }

  } catch (err: any) {
    error(`Browser Use Cloud API failed: ${err.message}`);
    throw err;
  }
}

async function pollTaskStatus(taskId: string, maxAttempts: number = 20): Promise<any> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      log(`📊 Checking task status (attempt ${attempt}/${maxAttempts})...`);
      
      const response = await request(`${BROWSER_USE_API_BASE}/task/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${BROWSER_USE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.statusCode !== 200) {
        const errorText = await response.body.text();
        warn(`Failed to get task status: ${errorText}`);
        await sleep(5000);
        continue;
      }
      
      const taskData = await response.body.json() as any;
      log(`📋 Task status: ${taskData.status || 'unknown'}`);
      
      if (taskData.status === 'completed' || taskData.status === 'finished') {
        success('🎉 Task completed!');
        return taskData;
      } else if (taskData.status === 'failed' || taskData.status === 'error') {
        error(`❌ Task failed: ${taskData.error || 'Unknown error'}`);
        return taskData;
      }
      
      // Task still running, wait before next poll
      await sleep(10000); // Wait 10 seconds
      
    } catch (err: any) {
      warn(`Error checking task status: ${err.message}`);
      await sleep(5000);
    }
  }
  
  warn('⏰ Task polling timeout reached');
  return null;
}

async function processTaskResult(taskData: any): Promise<void> {
  if (taskData.result) {
    success('📁 Task completed with results!');
    
    // Save the full result
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `spotify-browseruse-result-${timestamp}.json`;
    await writeFile(filename, JSON.stringify(taskData, null, 2));
    log(`📁 Full result saved to: ${filename}`);
    
    // Parse GraphQL queries
    await parseGraphQLQueries(taskData);
  } else {
    warn('No result data found in completed task');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function parseGraphQLQueries(resultData: any): Promise<void> {
  log('🔍 Parsing GraphQL queries from Browser Use result...');
  
  try {
    const resultString = JSON.stringify(resultData, null, 2);
    
    // Look for common GraphQL patterns
    const patterns = [
      /operationName["']?\s*:\s*["']([^"']+)["']/g,
      /sha256Hash["']?\s*:\s*["']([a-f0-9]{64})["']/g,
      /pathfinder.*query/gi,
      /"variables"\s*:\s*\{[^}]+\}/g
    ];
    
    const findings: string[] = [];
    
    patterns.forEach((pattern, index) => {
      const matches = [...resultString.matchAll(pattern)];
      if (matches.length > 0) {
        findings.push(`Pattern ${index + 1} matches:`);
        matches.forEach(match => findings.push(`  - ${match[1] || match[0]}`));
      }
    });
    
    if (findings.length > 0) {
      success('🎯 Found potential GraphQL data:');
      findings.forEach(finding => log(finding));
      
      // Save findings
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `graphql-findings-${timestamp}.txt`;
      await writeFile(filename, findings.join('\n'));
      log(`📁 Findings saved to: ${filename}`);
    } else {
      warn('No obvious GraphQL patterns found in result data');
    }
    
  } catch (err: any) {
    warn(`Could not parse GraphQL queries: ${err.message}`);
  }
}

// Test function for Joe Rogan
export async function extractJoeRoganQueriesCloud(): Promise<void> {
  return await extractSpotifyQueriesWithBrowserUse('4rOoJ6Egrf8K2IrywzwOMk');
}