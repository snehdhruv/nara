export function log(message: string, ...args: any[]) {
  console.log(`[ASR-YouTube] ${message}`, ...args);
}

export function warn(message: string, ...args: any[]) {
  console.warn(`[ASR-YouTube] ⚠️  ${message}`, ...args);
}

export function error(message: string, ...args: any[]) {
  console.error(`[ASR-YouTube] ❌ ${message}`, ...args);
}

export function success(message: string, ...args: any[]) {
  console.log(`[ASR-YouTube] ✅ ${message}`, ...args);
}

export function progress(message: string, ...args: any[]) {
  console.log(`[ASR-YouTube] 🔄 ${message}`, ...args);
}