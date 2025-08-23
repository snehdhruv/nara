import { request } from 'undici';
import { writeFile } from 'fs/promises';

const BROWSER_USE_API_KEY = 'bu_PP8-aT8Yc1zKzVrV0pBoenVjfZvcqOF5EZbDVEwps0k';
const BROWSER_USE_API_BASE = 'https://api.browser-use.com/api/v1';

async function downloadOutputFile(taskId: string, fileName: string) {
  try {
    console.log(`Downloading ${fileName}...`);
    
    const response = await request(`${BROWSER_USE_API_BASE}/task/${taskId}/output-file/${fileName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BROWSER_USE_API_KEY}`
      }
    });

    if (response.statusCode !== 200) {
      console.error(`Failed to download ${fileName}: ${response.statusCode}`);
      return;
    }

    const content = await response.body.text();
    const localFileName = `browseruse-${fileName}`;
    await writeFile(localFileName, content);
    console.log(`✅ Saved ${fileName} as ${localFileName}`);
    
    // Show first 1000 chars of content
    console.log(`\n--- Preview of ${fileName} ---`);
    console.log(content.substring(0, 1000));
    if (content.length > 1000) {
      console.log(`\n... (${content.length - 1000} more characters)`);
    }
    console.log(`\n--- End preview ---\n`);
    
  } catch (err) {
    console.error(`Error downloading ${fileName}:`, err);
  }
}

async function main() {
  const taskId = '45a3b1b5-6f59-49c4-bf14-d327ff995007';
  
  await downloadOutputFile(taskId, 'todo.md');
  await downloadOutputFile(taskId, 'logs.txt');
}

main().catch(console.error);