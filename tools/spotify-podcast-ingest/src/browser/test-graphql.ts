import { request } from 'undici';
import { log, error, success } from '../util/log.js';

const BROWSER_USE_API_KEY = 'bu_PP8-aT8Yc1zKzVrV0pBoenVjfZvcqOF5EZbDVEwps0k';
const BROWSER_USE_API_BASE = 'https://api.browser-use.com/api/v1';

async function testGraphQLWithBrowserUse(): Promise<void> {
  const taskDescription = `
  Go to https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk (Joe Rogan podcast).
  
  Your mission is to execute GraphQL queries against Spotify's Pathfinder API using the browser's fetch/JavaScript console.
  
  1. First, scroll down and wait for the page to load episodes
  
  2. Open the browser console (F12 -> Console tab)
  
  3. Test these GraphQL queries by executing them as JavaScript fetch requests:
  
  // Test Query 1: Basic show episodes
  fetch('https://api-partner.spotify.com/pathfinder/v1/query', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer BQCJNWvgyA1y6XclWDFZN4ldo0JeFpm_t3OTLH4f6CwCE4V0ERMwHayiKtiztRbzrJ901-F9ofRwrrScRg1EM8CPwXrA3lVZOKQXCw0mHjicqbQjJkKHsTUWDMkbmOHkLzoTYmlqGheJFoOGn6qU-0ivNdo_H26m_iltgech34s1ILA2iFXRM-4y90csgvLz0Ifx0Vtg2DZQBFV90gU2FoL5CUn2BJ1pEHcH_61hz1lD_UkGJkm_xGCASXrPmr6FNlZ3lA',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      operationName: 'queryShowEpisodes',
      variables: {
        uri: 'spotify:show:4rOoJ6Egrf8K2IrywzwOMk',
        offset: 0,
        limit: 10
      },
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash: 'a0c8b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2'
        }
      }
    })
  }).then(r => r.json()).then(console.log)
  
  // Test Query 2: Alternative operation name
  fetch('https://api-partner.spotify.com/pathfinder/v1/query', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer BQCJNWvgyA1y6XclWDFZN4ldo0JeFpm_t3OTLH4f6CwCE4V0ERMwHayiKtiztRbzrJ901-F9ofRwrrScRg1EM8CPwXrA3lVZOKQXCw0mHjicqbQjJkKHsTUWDMkbmOHkLzoTYmlqGheJFoOGn6qU-0ivNdo_H26m_iltgech34s1ILA2iFXRM-4y90csgvLz0Ifx0Vtg2DZQBFV90gU2FoL5CUn2BJ1pEHcH_61hz1lD_UkGJkm_xGCASXrPmr6FNlZ3lA',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      operationName: 'podcastShowEpisodes',
      variables: {
        uri: 'spotify:show:4rOoJ6Egrf8K2IrywzwOMk',
        offset: 0,
        limit: 10
      }
    })
  }).then(r => r.json()).then(console.log)
  
  // Test Query 3: Raw GraphQL without persisted query
  fetch('https://api-partner.spotify.com/pathfinder/v1/query', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer BQCJNWvgyA1y6XclWDFZN4ldo0JeFpm_t3OTLH4f6CwCE4V0ERMwHayiKtiztRbzrJ901-F9ofRwrrScRg1EM8CPwXrA3lVZOKQXCw0mHjicqbQjJkKHsTUWDMkbmOHkLzoTYmlqGheJFoOGn6qU-0ivNdo_H26m_iltgech34s1ILA2iFXRM-4y90csgvLz0Ifx0Vtg2DZQBFV90gU2FoL5CUn2BJ1pEHcH_61hz1lD_UkGJkm_xGCASXrPmr6FNlZ3lA',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      operationName: 'getShowEpisodes',
      query: 'query getShowEpisodes($uri: String!) { show(uri: $uri) { episodes { items { id name description } } } }',
      variables: {
        uri: 'spotify:show:4rOoJ6Egrf8K2IrywzwOMk'
      }
    })
  }).then(r => r.json()).then(console.log)
  
  4. For each fetch request, capture:
     - The response status (200, 403, etc.)
     - The response body/data
     - Any error messages
     
  5. Try different sha256Hash values if the first ones fail:
     - 'b1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2'
     - 'c2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3'
     
  6. Save ALL results to a text file, including successful queries and their exact parameters
  
  Focus on finding ANY working GraphQL query that returns episode data!
  `;

  try {
    log('🔄 Creating Browser Use task to test GraphQL queries...');
    
    const taskResponse = await request(`${BROWSER_USE_API_BASE}/run-task`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BROWSER_USE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        task: taskDescription,
        wait_for_completion: false,
        max_steps: 15
      })
    });

    if (taskResponse.statusCode !== 200) {
      const errorText = await taskResponse.body.text();
      throw new Error(`Browser Use API error (${taskResponse.statusCode}): ${errorText}`);
    }

    const result = await taskResponse.body.json() as any;
    const taskId = result.id;
    
    success(`✅ GraphQL testing task created with ID: ${taskId}`);
    log('🔄 Task is running. Check status manually or wait for completion.');
    log(`📱 Live URL: https://live.anchorbrowser.io?sessionId=${taskId}`);
    
    return taskId;

  } catch (err: any) {
    error(`Failed to create GraphQL test task: ${err.message}`);
    throw err;
  }
}

// Run the test
testGraphQLWithBrowserUse().catch(console.error);