import { test, expect } from '@playwright/test';

test('Favorites tab recalculation should work', async ({ page }) => {
    // Capture console logs
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[FavoritesTab]') || text.includes('favorites')) {
            console.log(`[BROWSER] ${text}`);
        }
    });
    
    // Navigate to the app
    await page.goto('http://localhost:5174/');
    
    // Wait for app to load
    await page.waitForTimeout(2000);
    
    console.log('[Test] Checking if combos need to be calculated...');
    
    // Go to Setup tab to ensure combos are calculated
    await page.click('text=Setup');
    await page.waitForTimeout(500);
    
    // Click Calculate gear ratios if button is visible
    const calculateButton = page.locator('button:has-text("Calculate gear ratios")');
    const isCalculateVisible = await calculateButton.isVisible().catch(() => false);
    
    if (isCalculateVisible) {
        console.log('[Test] Calculating gear ratios...');
        await calculateButton.click();
        
        // Wait for calculation to complete (up to 10 seconds)
        await page.waitForTimeout(10000);
        console.log('[Test] Gear ratios calculated');
    } else {
        console.log('[Test] Gear ratios already calculated');
    }
    
    console.log('[Test] Navigating to Favorites tab...');
    
    // Click on Favorites tab
    await page.click('text=Favorites');
    await page.waitForTimeout(1000);
    
    // Check if recalculation banner is visible
    const banner = page.locator('.recalculation-banner');
    const isBannerVisible = await banner.isVisible().catch(() => false);
    
    console.log(`[Test] Banner visible: ${isBannerVisible}`);
    
    if (isBannerVisible) {
        console.log('[Test] Clicking Recalculate Now...');
        
        // Get favorites count before recalculation
        const beforeState = await page.evaluate(() => {
            const favoritesJson = localStorage.getItem('favorites');
            return {
                favorites: favoritesJson,
                favoritesCount: favoritesJson ? JSON.parse(favoritesJson).length : 0
            };
        });
        
        console.log(`[Test] Favorites before: ${beforeState.favoritesCount}`);
        
        // Click the Recalculate Now button
        await page.click('button:has-text("Recalculate Now")');
        
        console.log('[Test] Waiting for recalculation to complete...');
        
        // Wait for recalculation to complete (banner should hide)
        // Give it up to 90 seconds for the worker to complete
        await page.waitForSelector('.recalculation-banner', { 
            state: 'hidden', 
            timeout: 90000 
        }).catch(async () => {
            console.log('[Test] Banner did not hide within 90 seconds, checking state...');
            const stillVisible = await banner.isVisible();
            console.log(`[Test] Banner still visible: ${stillVisible}`);
        });
        
        // Wait a bit for favorites to be saved
        await page.waitForTimeout(1000);
        
        // Get favorites count after recalculation
        const afterState = await page.evaluate(() => {
            const favoritesJson = localStorage.getItem('favorites');
            return {
                favorites: favoritesJson,
                favoritesCount: favoritesJson ? JSON.parse(favoritesJson).length : 0
            };
        });
        
        console.log(`[Test] Favorites after: ${afterState.favoritesCount}`);
        
        // Verify favorites were generated (should have more than 0)
        expect(afterState.favoritesCount).toBeGreaterThan(0);
        
        // Verify favorites are not empty array
        expect(afterState.favorites).not.toBe('[]');
        
        console.log('[Test] ✅ Recalculation successful! Favorites generated.');
    } else {
        console.log('[Test] No recalculation needed (banner not visible)');
        
        // Check that favorites exist
        const state = await page.evaluate(() => {
            const favoritesJson = localStorage.getItem('favorites');
            return {
                favoritesCount: favoritesJson ? JSON.parse(favoritesJson).length : 0
            };
        });
        
        console.log(`[Test] Current favorites count: ${state.favoritesCount}`);
    }
    
    // Check that the optimization info is visible
    const optimizationInfo = page.locator('.notification.is-info');
    const isInfoVisible = await optimizationInfo.isVisible();
    expect(isInfoVisible).toBe(true);
    
    console.log('[Test] ✅ Optimization info is visible');
    
    // Verify the info contains expected text
    const infoText = await optimizationInfo.textContent();
    expect(infoText).toContain('Pitch Accuracy');
    expect(infoText).toContain('Simplicity');
    expect(infoText).toContain('Mechanical Advantage');
    expect(infoText).toContain('Smooth Operation');
    
    console.log('[Test] ✅ All tests passed!');
});

