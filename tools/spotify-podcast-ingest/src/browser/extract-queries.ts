import puppeteer from 'puppeteer';
import { log, error, warn, success } from '../util/log.js';
import { writeFile } from 'fs/promises';

interface ExtractedQuery {
  operationName: string;
  variables: any;
  query?: string;
  extensions?: {
    persistedQuery?: {
      version: number;
      sha256Hash: string;
    };
  };
  response?: any;
}

export async function extractSpotifyQueries(
  showUrl: string,
  apiKey: string
): Promise<ExtractedQuery[]> {
  log('🌐 Starting browser automation to extract Spotify queries...');
  
  const browser = new Browser({
    apiKey,
    // headless: false, // Set to false for debugging
  });

  const extractedQueries: ExtractedQuery[] = [];

  try {
    // Navigate to Spotify Web Player
    log('🔄 Opening Spotify Web Player...');
    await browser.goTo('https://open.spotify.com/');
    
    // Wait for page to load
    await browser.wait(3000);
    
    // Set up network interception to capture GraphQL requests
    log('🔄 Setting up network monitoring...');
    
    const page = await browser.getPage();
    
    // Listen for network requests
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      // Allow all requests to proceed
      request.continue();
    });
    
    page.on('response', async (response) => {
      const url = response.url();
      
      // Capture Pathfinder API calls
      if (url.includes('pathfinder') && url.includes('query')) {
        try {
          const request = response.request();
          const postData = request.postData();
          
          if (postData) {
            const queryData = JSON.parse(postData);
            const responseData = await response.json();
            
            log(`📡 Captured GraphQL query: ${queryData.operationName}`);
            
            extractedQueries.push({
              operationName: queryData.operationName,
              variables: queryData.variables,
              query: queryData.query,
              extensions: queryData.extensions,
              response: responseData
            });
          }
        } catch (err) {
          warn(`Failed to parse GraphQL request: ${err}`);
        }
      }
    });
    
    // Navigate to the specific show
    log(`🔄 Navigating to show: ${showUrl}`);
    await browser.goTo(showUrl);
    
    // Wait for show to load
    await browser.wait(5000);
    
    // Try to scroll down to load more episodes (triggers more API calls)
    log('🔄 Scrolling to trigger more API calls...');
    await browser.scroll(0, 1000);
    await browser.wait(2000);
    await browser.scroll(0, 2000);
    await browser.wait(2000);
    
    // Click on an episode to potentially trigger transcript-related calls
    log('🔄 Trying to click on an episode...');
    try {
      await browser.click('div[data-testid="episode-item"]');
      await browser.wait(3000);
    } catch (err) {
      warn('Could not click on episode, continuing...');
    }
    
    // Try alternative episode selectors
    try {
      await browser.click('a[href*="/episode/"]');
      await browser.wait(3000);
    } catch (err) {
      warn('Could not click on episode link, continuing...');
    }
    
    log(`✅ Extraction complete! Captured ${extractedQueries.length} queries`);
    
    // Save queries to file for analysis
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `extracted-queries-${timestamp}.json`;
    await writeFile(filename, JSON.stringify(extractedQueries, null, 2));
    
    success(`📁 Queries saved to: ${filename}`);
    
    return extractedQueries;
    
  } catch (err: any) {
    error(`Browser extraction failed: ${err.message}`);
    throw err;
  } finally {
    await browser.close();
  }
}

export async function extractQueriesForShow(showId: string): Promise<ExtractedQuery[]> {
  const apiKey = 'bu_PP8-aT8Yc1zKzVrV0pBoenVjfZvcqOF5EZbDVEwps0k';
  const showUrl = `https://open.spotify.com/show/${showId}`;
  
  return await extractSpotifyQueries(showUrl, apiKey);
}

// Test function for Joe Rogan show
export async function extractJoeRoganQueries(): Promise<ExtractedQuery[]> {
  return await extractQueriesForShow('4rOoJ6Egrf8K2IrywzwOMk');
}