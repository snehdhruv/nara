import { spawn } from 'child_process';
import { join } from 'path';
import { readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';

export interface CaptionSegment {
  start_s: number;
  end_s: number;
  text: string;
}

export interface CaptionOptions {
  lang?: string;
  fallbackAuto?: boolean;
}

export async function fetchCaptionsASR(
  videoId: string,
  options: CaptionOptions = {}
): Promise<{ segments: CaptionSegment[], kind: 'human' | 'auto' }> {
  const { lang = 'en' } = options;
  
  console.log(`🔄 Using ASR fallback for video: ${videoId}`);
  
  try {
    // Path to the ASR tool
    const asrToolPath = join(process.cwd(), '../asr-youtube');
    const tempOutputDir = join(tmpdir(), `asr-output-${Date.now()}`);
    
    // Check if ASR tool exists
    try {
      await readFile(join(asrToolPath, 'package.json'));
    } catch {
      throw new Error('ASR tool not found. Please ensure ../asr-youtube exists and is built.');
    }
    
    console.log(`Running ASR tool from: ${asrToolPath}`);
    console.log(`Output will be written to: ${tempOutputDir}`);
    
    // Run the ASR tool as a child process
    const result = await runASRTool(videoId, {
      lang,
      asrToolPath,
      outputDir: tempOutputDir
    });
    
    if (!result.success) {
      throw new Error(`ASR tool failed: ${result.error}`);
    }
    
    // Read the generated JSON file
    const jsonPath = join(tempOutputDir, `${videoId}.json`);
    const jsonContent = await readFile(jsonPath, 'utf-8');
    const asrData = JSON.parse(jsonContent);
    
    // Extract segments from ASR result
    const segments: CaptionSegment[] = asrData.segments || [];
    
    console.log(`✅ ASR extraction successful: ${segments.length} segments`);
    
    // Cleanup temp file
    try {
      await unlink(jsonPath);
    } catch {
      // Ignore cleanup errors
    }
    
    return {
      segments,
      kind: 'auto' // ASR is always auto-generated
    };
    
  } catch (error: any) {
    console.error(`ASR fallback failed: ${error.message}`);
    throw error;
  }
}

interface ASROptions {
  lang: string;
  asrToolPath: string;
  outputDir: string;
}

function runASRTool(videoId: string, options: ASROptions): Promise<{ success: boolean; error?: string }> {
  const { lang, asrToolPath, outputDir } = options;
  
  return new Promise((resolve) => {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    const args = [
      'run', 'transcribe', '--',
      '--url', videoUrl,
      '--lang', lang,
      '--out', outputDir,
      '--paragraph-min', '2',
      '--paragraph-max', '4'
    ];
    
    console.log(`Spawning: npm ${args.join(' ')}`);
    
    const child = spawn('npm', args, {
      cwd: asrToolPath,
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Inherit parent process environment including OPENAI_API_KEY
      }
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`[ASR] ${output.trim()}`);
    });
    
    child.stderr?.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error(`[ASR] ${output.trim()}`);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ 
          success: false, 
          error: `Process exited with code ${code}. stderr: ${stderr.slice(-200)}` 
        });
      }
    });
    
    child.on('error', (error) => {
      resolve({ 
        success: false, 
        error: `Failed to spawn process: ${error.message}` 
      });
    });
    
    // Timeout after 10 minutes
    setTimeout(() => {
      if (!child.killed) {
        child.kill();
        resolve({ 
          success: false, 
          error: 'ASR process timed out after 10 minutes' 
        });
      }
    }, 10 * 60 * 1000);
  });
}