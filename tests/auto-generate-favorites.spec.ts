import { test, expect } from '@playwright/test';

test('Fresh install should auto-generate favorites', async ({ page }) => {
    // Capture console logs
    page.on('console', msg => {
        const text = msg.text();
        console.log(`[BROWSER] ${text}`);
    });
    
    // Clear localStorage to simulate fresh install
    await page.goto('http://localhost:5174/');
    await page.evaluate(() => {
        localStorage.clear();
    });
    
    console.log('[Test] Cleared localStorage, reloading page...');
    
    // Reload to simulate fresh install
    await page.reload();
    
    console.log('[Test] Waiting for auto-generation to complete...');
    
    // Wait for combos to calculate and auto-generation to trigger (up to 180 seconds)
    await page.waitForTimeout(180000);
    
    // Check favorites were generated
    const state = await page.evaluate(() => {
        const favoritesJson = localStorage.getItem('favorites');
        return {
            favorites: favoritesJson,
            favoritesCount: favoritesJson ? JSON.parse(favoritesJson).length : 0
        };
    });
    
    console.log(`[Test] Favorites count: ${state.favoritesCount}`);
    
    // Verify favorites were auto-generated
    expect(state.favoritesCount).toBeGreaterThan(0);
    
    console.log('[Test] ✅ Favorites auto-generated successfully!');
});

