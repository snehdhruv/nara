export function log(message, ...args) {
    console.log(`[ASR-YouTube] ${message}`, ...args);
}
export function warn(message, ...args) {
    console.warn(`[ASR-YouTube] ⚠️  ${message}`, ...args);
}
export function error(message, ...args) {
    console.error(`[ASR-YouTube] ❌ ${message}`, ...args);
}
export function success(message, ...args) {
    console.log(`[ASR-YouTube] ✅ ${message}`, ...args);
}
export function progress(message, ...args) {
    console.log(`[ASR-YouTube] 🔄 ${message}`, ...args);
}
