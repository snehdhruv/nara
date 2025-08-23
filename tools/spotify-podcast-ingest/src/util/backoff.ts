import { log, warn } from './log.js';

export interface BackoffOptions {
  baseMs?: number;
  factor?: number;
  maxDelayMs?: number;
  maxAttempts?: number;
  jitter?: boolean;
}

export interface BackoffConfig extends Required<BackoffOptions> {}

const DEFAULT_CONFIG: BackoffConfig = {
  baseMs: 500,
  factor: 2,
  maxDelayMs: 20000,
  maxAttempts: 6,
  jitter: true
};

export async function withBackoff<T>(
  operation: () => Promise<T>,
  shouldRetry: (error: any) => boolean = (error) => error.status >= 500 || error.status === 429,
  options: BackoffOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_CONFIG, ...options };
  let attempt = 1;
  let delay = config.baseMs;

  while (attempt <= config.maxAttempts) {
    try {
      return await operation();
    } catch (error: any) {
      if (attempt >= config.maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      // Check for Retry-After header
      let waitTime = delay;
      if (error.headers?.['retry-after']) {
        const retryAfter = parseInt(error.headers['retry-after']);
        if (!isNaN(retryAfter)) {
          waitTime = Math.min(retryAfter * 1000, config.maxDelayMs);
        }
      }

      // Apply jitter
      if (config.jitter) {
        waitTime = Math.random() * waitTime;
      }

      warn(`Attempt ${attempt}/${config.maxAttempts} failed (${error.status || error.code}), retrying in ${Math.round(waitTime)}ms...`);
      
      await sleep(waitTime);
      
      attempt++;
      delay = Math.min(delay * config.factor, config.maxDelayMs);
    }
  }

  throw new Error('This should never be reached');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isRetryableError(error: any): boolean {
  // 429 Too Many Requests
  if (error.status === 429) return true;
  
  // 5xx server errors
  if (error.status >= 500 && error.status < 600) return true;
  
  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') return true;
  
  return false;
}