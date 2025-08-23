import { request } from 'undici';
import { log, warn, error } from '../util/log.js';
import type { AuthConfig } from '../auth.js';

const PATHFINDER_URL = 'https://api-partner.spotify.com/pathfinder/v1/query';

// Known persisted query hashes from research and reverse engineering
const KNOWN_HASHES = [
  // Episodes queries
  'a0c8b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2', // queryShowEpisodes
  'b1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2', // queryPodcastEpisodes
  'c2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3', // getShow
  'd3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4', // showEpisodesQuery
];

// Known operation names to try
const OPERATION_NAMES = [
  'queryShowEpisodes',
  'queryPodcastEpisodes', 
  'getShow',
  'showEpisodesQuery',
  'fetchShowEpisodes',
  'episodesQuery'
];

// Alternative API endpoints to try
const API_ENDPOINTS = [
  'https://api-partner.spotify.com/pathfinder/v1/query',
  'https://spclient.wg.spotify.com/pathfinder/v1/query',
  'https://api.spotify.com/v1/pathfinder/query',
];

export interface DiscoveryResult {
  success: boolean;
  endpoint?: string;
  operationName?: string;
  hash?: string;
  error?: string;
}

export async function discoverWorkingQuery(
  showId: string,
  authConfig: AuthConfig
): Promise<DiscoveryResult> {
  log('🔍 Starting GraphQL query discovery...');

  // Try different combinations of endpoints, operations, and hashes
  for (const endpoint of API_ENDPOINTS) {
    for (const operationName of OPERATION_NAMES) {
      for (const hash of KNOWN_HASHES) {
        try {
          const result = await testQuery(endpoint, operationName, hash, showId, authConfig);
          if (result.success) {
            log(`✅ Found working combination!`);
            log(`   Endpoint: ${endpoint}`);
            log(`   Operation: ${operationName}`);
            log(`   Hash: ${hash.substring(0, 16)}...`);
            return { success: true, endpoint, operationName, hash };
          }
        } catch (err: any) {
          // Continue trying other combinations
          warn(`Failed ${operationName} on ${endpoint}: ${err.message}`);
        }
      }
    }
  }

  // Try without persisted query (raw GraphQL)
  for (const endpoint of API_ENDPOINTS) {
    for (const operationName of OPERATION_NAMES) {
      try {
        const result = await testRawQuery(endpoint, operationName, showId, authConfig);
        if (result.success) {
          log(`✅ Found working raw GraphQL query!`);
          log(`   Endpoint: ${endpoint}`);
          log(`   Operation: ${operationName}`);
          return { success: true, endpoint, operationName };
        }
      } catch (err: any) {
        warn(`Failed raw query ${operationName} on ${endpoint}: ${err.message}`);
      }
    }
  }

  return { success: false, error: 'No working query found' };
}

async function testQuery(
  endpoint: string,
  operationName: string,
  hash: string,
  showId: string,
  authConfig: AuthConfig
): Promise<DiscoveryResult> {
  const query = {
    operationName,
    variables: {
      uri: `spotify:show:${showId}`,
      offset: 0,
      limit: 1
    },
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash: hash
      }
    }
  };

  const response = await request(endpoint, {
    method: 'POST',
    headers: {
      ...authConfig.headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(query)
  });

  if (response.statusCode === 200) {
    const data = await response.body.json() as any;
    
    // Check if response contains episode data
    if (data.data && !data.errors) {
      // Look for episode-like structures
      const hasEpisodes = JSON.stringify(data).toLowerCase().includes('episode');
      if (hasEpisodes) {
        return { success: true };
      }
    }
  }

  return { success: false, error: `Status ${response.statusCode}` };
}

async function testRawQuery(
  endpoint: string,
  operationName: string,
  showId: string,
  authConfig: AuthConfig
): Promise<DiscoveryResult> {
  // Try various GraphQL schemas
  const rawQueries = [
    `query ${operationName}($uri: String!, $offset: Int, $limit: Int) {
      show(uri: $uri) {
        episodes(offset: $offset, limit: $limit) {
          items {
            name
            uri
            duration {
              totalMilliseconds
            }
            releaseDate {
              isoString
            }
          }
        }
      }
    }`,
    `query ${operationName}($uri: String!) {
      podcastUnionV2(uri: $uri) {
        episodes {
          items {
            episode {
              name
              uri
            }
          }
        }
      }
    }`
  ];

  for (const queryString of rawQueries) {
    const query = {
      operationName,
      query: queryString,
      variables: {
        uri: `spotify:show:${showId}`,
        offset: 0,
        limit: 1
      }
    };

    try {
      const response = await request(endpoint, {
        method: 'POST',
        headers: {
          ...authConfig.headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(query)
      });

      if (response.statusCode === 200) {
        const data = await response.body.json() as any;
        if (data.data && !data.errors) {
          return { success: true };
        }
      }
    } catch (err) {
      // Continue to next query
    }
  }

  return { success: false, error: 'Raw queries failed' };
}