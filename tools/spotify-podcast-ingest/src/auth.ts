import { readJSONFile, fileExists } from './util/fsx.js';
import { log, warn } from './util/log.js';

export interface AuthConfig {
  headers: Record<string, string>;
}

export interface AuthOptions {
  bearerToken?: string;
  headersFile?: string;
  market?: string;
  lang?: string;
}

export async function loadAuthConfig(options: AuthOptions): Promise<AuthConfig> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  // Load from headers file if provided
  if (options.headersFile) {
    if (await fileExists(options.headersFile)) {
      log(`Loading headers from: ${options.headersFile}`);
      const fileHeaders = await readJSONFile(options.headersFile);
      Object.assign(headers, fileHeaders);
    } else {
      warn(`Headers file not found: ${options.headersFile}`);
    }
  }

  // Override with bearer token if provided
  if (options.bearerToken) {
    headers['Authorization'] = options.bearerToken.startsWith('Bearer ') 
      ? options.bearerToken 
      : `Bearer ${options.bearerToken}`;
    log('Using provided bearer token');
  }

  // Add default Spotify-specific headers if not present
  if (!headers['App-Platform']) {
    headers['App-Platform'] = 'WebPlayer';
  }
  
  if (!headers['X-Client-Id']) {
    // This should be extracted from real browser requests
    headers['X-Client-Id'] = 'unknown';
  }

  // Validate we have authorization
  if (!headers['Authorization']) {
    throw new Error('No authorization provided. Use --auth "Bearer <token>" or --headers with Authorization header');
  }

  log('Auth configuration loaded successfully');
  
  return { headers };
}

export function extractShowId(showInput: string): string {
  // Handle full Spotify URL
  const urlMatch = showInput.match(/spotify\.com\/show\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  
  // Handle direct show ID
  if (/^[a-zA-Z0-9]+$/.test(showInput)) {
    return showInput;
  }
  
  throw new Error(`Invalid show format: ${showInput}. Expected Spotify show URL or show ID`);
}