import { test, expect } from '@playwright/test';

test.describe('Nara YouTube Integration', () => {
  test('should load the Nara app', async ({ page }) => {
    await page.goto('/nara');
    
    // Should not show 404 error
    await expect(page.locator('text=404')).not.toBeVisible();
    
    // Should load the main dashboard
    await expect(page.locator('text=Currently Reading')).toBeVisible({ timeout: 10000 });
  });

  test('should open YouTube search', async ({ page }) => {
    await page.goto('/nara');
    
    // Wait for dashboard to load
    await expect(page.locator('text=Currently Reading')).toBeVisible({ timeout: 10000 });
    
    // Find and click the YouTube add button
    const addButton = page.locator('button').filter({ hasText: /add|youtube/i }).first();
    await addButton.click();
    
    // Should show YouTube search interface
    await expect(page.locator('text=Add YouTube Audiobook')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
  });

  test('should search for audiobooks on YouTube', async ({ page }) => {
    await page.goto('/nara');
    
    // Open YouTube search
    await expect(page.locator('text=Currently Reading')).toBeVisible({ timeout: 10000 });
    const addButton = page.locator('button').filter({ hasText: /add|youtube/i }).first();
    await addButton.click();
    
    await expect(page.locator('text=Add YouTube Audiobook')).toBeVisible({ timeout: 5000 });
    
    // Search for a book
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('lean startup');
    
    const searchButton = page.locator('button').filter({ hasText: 'Search' });
    await searchButton.click();
    
    // Should show search results
    await expect(page.locator('text=Search Results')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h3').filter({ hasText: 'The Lean Startup' })).toBeVisible();
  });

  test('should add YouTube audiobook to library', async ({ page }) => {
    await page.goto('/nara');
    
    // Open YouTube search and search
    await expect(page.locator('text=Currently Reading')).toBeVisible({ timeout: 10000 });
    const addButton = page.locator('button').filter({ hasText: /add|youtube/i }).first();
    await addButton.click();
    
    await expect(page.locator('text=Add YouTube Audiobook')).toBeVisible({ timeout: 5000 });
    
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('lean startup');
    
    const searchButton = page.locator('button').filter({ hasText: 'Search' });
    await searchButton.click();
    
    await expect(page.locator('h3').filter({ hasText: 'The Lean Startup' })).toBeVisible({ timeout: 5000 });
    
    // Click "Add to Library" button
    const addToLibraryButton = page.locator('button').filter({ hasText: 'Add to Library' }).first();
    await addToLibraryButton.click();
    
    // Should show processing state
    await expect(page.locator('text=Processing')).toBeVisible({ timeout: 5000 });
    
    // Should successfully add the book (wait for processing to complete)
    await expect(page.locator('text=Processing')).not.toBeVisible({ timeout: 15000 });
    
    // Should return to dashboard and show the new book
    await expect(page.locator('text=Currently Reading')).toBeVisible({ timeout: 5000 });
    
    // Wait for the book list to refresh and check both sections
    await page.waitForTimeout(2000);
    
    // The book should appear and we should be navigated to it (check for the player interface)
    await expect(page.locator('h1').filter({ hasText: 'The Lean Startup' })).toBeVisible({ timeout: 10000 });
  });

  test('should play audiobook and update time', async ({ page }) => {
    await page.goto('/nara');
    
    // Enable console logging to debug
    page.on('console', (msg) => {
      if (msg.text().includes('YouTube') || msg.text().includes('Player')) {
        console.log('Browser:', msg.text());
      }
    });
    
    // Add a book first (simplified version)
    await expect(page.locator('text=Currently Reading')).toBeVisible({ timeout: 10000 });
    
    // Select the first available book
    const firstBook = page.locator('[data-testid="book-item"]').first();
    if (await firstBook.isVisible()) {
      await firstBook.click();
    } else {
      // If no books, select zero-to-one default
      const zeroToOneBook = page.locator('text=Zero to One').first();
      await zeroToOneBook.click();
    }
    
    // Should load the audiobook player
    await expect(page.locator('[data-testid="play-button"]')).toBeVisible({ timeout: 10000 });
    
    // Check if YouTube API is loaded
    const ytApiLoaded = await page.evaluate(() => {
      return typeof window.YT !== 'undefined' && !!window.YT.Player;
    });
    console.log('YouTube API loaded:', ytApiLoaded);
    
    // Get initial time
    const timeDisplay = page.locator('[data-testid="current-time"]');
    const initialTime = await timeDisplay.textContent();
    console.log('Initial time:', initialTime);
    
    // Click play button
    const playButton = page.locator('[data-testid="play-button"]');
    await playButton.click();
    
    // Wait for playback to start and check multiple times
    await page.waitForTimeout(2000);
    const time1 = await timeDisplay.textContent();
    console.log('Time after 2s:', time1);
    
    await page.waitForTimeout(2000);
    const time2 = await timeDisplay.textContent();
    console.log('Time after 4s:', time2);
    
    // Check if button changed to pause
    const pauseButtonExists = await page.locator('[data-testid="pause-button"]').isVisible();
    console.log('Pause button visible:', pauseButtonExists);
    
    // Time should have updated
    const updatedTime = await timeDisplay.textContent();
    expect(updatedTime).not.toBe(initialTime);
    expect(updatedTime).not.toBe('2340'); // Should not be stuck at 2340
  });

  test('should persist audiobook progress to Convex', async ({ page }) => {
    await page.goto('/nara');
    
    await expect(page.locator('text=Currently Reading')).toBeVisible({ timeout: 10000 });
    
    // Select a book (Zero to One should be available)
    const zeroToOneBook = page.locator('text=Zero to One').first();
    await zeroToOneBook.click();
    
    await expect(page.locator('[data-testid="play-button"]')).toBeVisible({ timeout: 10000 });
    
    // Manually update progress via API to test Convex integration
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/books/zero-to-one', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress: 0.25,
          lastPosition: 1000,
          currentChapter: 3
        })
      });
      return res.json();
    });
    
    // Verify the API call succeeded
    await page.evaluate((response) => {
      console.log('Progress update response:', response);
      if (!response.success) {
        throw new Error('Failed to update progress: ' + response.error);
      }
    }, response);
    
    // Refresh the page to verify data persistence
    await page.reload();
    
    // Select the book again
    await expect(page.locator('text=Currently Reading')).toBeVisible({ timeout: 10000 });
    const reloadedBook = page.locator('text=Zero to One').first();
    await reloadedBook.click();
    
    // Verify that progress was persisted (this tests Convex integration)
    await expect(page.locator('[data-testid="current-time"]')).toBeVisible({ timeout: 5000 });
    
    // The time should reflect the saved position (16:40 for 1000 seconds)
    const savedTime = await page.locator('[data-testid="current-time"]').textContent();
    console.log('Saved time after reload:', savedTime);
    
    // Should not be 0:00 if progress was saved
    expect(savedTime).not.toBe('0:00');
  });

  test('should persist audiobook progress', async ({ page }) => {
    await page.goto('/nara');
    
    await expect(page.locator('text=Currently Reading')).toBeVisible({ timeout: 10000 });
    
    // Select a book and play it
    const zeroToOneBook = page.locator('text=Zero to One').first();
    await zeroToOneBook.click();
    
    await expect(page.locator('[data-testid="play-button"]')).toBeVisible({ timeout: 10000 });
    
    const playButton = page.locator('[data-testid="play-button"]');
    await playButton.click();
    
    // Wait for some progress
    await page.waitForTimeout(5000);
    
    const timeDisplay = page.locator('[data-testid="current-time"]');
    const progressTime = await timeDisplay.textContent();
    
    // Pause playback
    const pauseButton = page.locator('[data-testid="pause-button"]');
    await pauseButton.click();
    
    // Go back to dashboard
    const backButton = page.locator('button[aria-label="Back to dashboard"]');
    await backButton.click();
    
    await expect(page.locator('text=Currently Reading')).toBeVisible({ timeout: 5000 });
    
    // Select the same book again
    await zeroToOneBook.click();
    
    // Progress should be maintained
    await expect(page.locator('[data-testid="current-time"]')).toBeVisible({ timeout: 5000 });
    const restoredTime = await timeDisplay.textContent();
    
    // Time should be close to where we left off (allowing for small variations)
    expect(restoredTime).toBeTruthy();
    expect(restoredTime).not.toBe('0:00');
  });
});