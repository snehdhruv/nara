import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
export async function createTempFile(extension = '.mp3') {
    const tempDir = tmpdir();
    const fileName = `asr-youtube-${Date.now()}-${Math.random().toString(36).substring(2)}${extension}`;
    const path = join(tempDir, fileName);
    return {
        path,
        async cleanup() {
            try {
                await fs.unlink(path);
            }
            catch (error) {
                // File may already be deleted, ignore error
            }
        }
    };
}
export async function ensureDir(dirPath) {
    try {
        await fs.access(dirPath);
    }
    catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}
export async function safeWriteFile(filePath, content) {
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, content, 'utf-8');
    await fs.rename(tempPath, filePath);
}
