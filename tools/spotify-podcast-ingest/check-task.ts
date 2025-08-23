import { request } from 'undici';

const BROWSER_USE_API_KEY = 'bu_PP8-aT8Yc1zKzVrV0pBoenVjfZvcqOF5EZbDVEwps0k';
const BROWSER_USE_API_BASE = 'https://api.browser-use.com/api/v1';

async function checkTask(taskId: string) {
  const response = await request(`${BROWSER_USE_API_BASE}/task/${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${BROWSER_USE_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.body.json();
  console.log('Full task data:', JSON.stringify(data, null, 2));
}

// Check the latest task
checkTask('45a3b1b5-6f59-49c4-bf14-d327ff995007').catch(console.error);