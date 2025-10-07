import { test, expect } from '@playwright/test';

test('Fresh install should show recalculation banner and generate favorites', async ({ page }) => {
    // Capture console logs
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[App]') || text.includes('[PitchTableTab]') || text.includes('favorites')) {
            console.log(`[BROWSER] ${text}`);
        }
    });
    
    // Clear localStorage to simulate fresh install
    await page.goto('http://localhost:5174/');
    await page.evaluate(() => {
        localStorage.clear();
    });
    
    console.log('[Test] Cleared localStorage, reloading page...');
    
    // Reload to simulate fresh install
    await page.reload();
    await page.waitForTimeout(3000);
    
    console.log('[Test] Page reloaded, checking state...');
    
    // Check localStorage state
    const storageState = await page.evaluate(() => {
        return {
            favorites: localStorage.getItem('favorites'),
            combos: localStorage.getItem('gearCombos')
        };
    });
    
    console.log(`[Test] Favorites in storage: ${storageState.favorites}`);
    console.log(`[Test] Combos in storage: ${storageState.combos ? 'exists' : 'null'}`);
    
    // Wait for combos to be calculated (app does this automatically)
    console.log('[Test] Waiting for combos to be calculated...');
    await page.waitForTimeout(8000);
    
    // Check if recalculation banner is visible on Pitch Table tab
    const banner = page.locator('.recalculation-banner');
    const isBannerVisible = await banner.isVisible().catch(() => false);
    
    console.log(`[Test] Recalculation banner visible: ${isBannerVisible}`);
    
    if (isBannerVisible) {
        console.log('[Test] ✅ Banner is visible on fresh install!');
        
        // Click the Recalculate Favorites button
        console.log('[Test] Clicking Recalculate Favorites...');
        await page.click('button:has-text("Recalculate Favorites")');
        
        // Wait for recalculation to complete (up to 90 seconds)
        console.log('[Test] Waiting for recalculation to complete...');
        await page.waitForSelector('.recalculation-banner', { 
            state: 'hidden', 
            timeout: 90000 
        }).catch(async () => {
            console.log('[Test] Banner did not hide within 90 seconds');
        });
        
        // Wait a bit for favorites to be saved
        await page.waitForTimeout(1000);
        
        // Check favorites were generated
        const afterState = await page.evaluate(() => {
            const favoritesJson = localStorage.getItem('favorites');
            return {
                favorites: favoritesJson,
                favoritesCount: favoritesJson ? JSON.parse(favoritesJson).length : 0
            };
        });
        
        console.log(`[Test] Favorites after recalculation: ${afterState.favoritesCount}`);
        
        // Verify favorites were generated
        expect(afterState.favoritesCount).toBeGreaterThan(0);
        console.log('[Test] ✅ Favorites generated successfully!');
        
        // Navigate to Favorites tab to verify they're displayed
        await page.click('text=Favorites');
        await page.waitForTimeout(1000);
        
        // Check that favorites are displayed in the table
        const rows = page.locator('tbody tr');
        const rowCount = await rows.count();
        
        console.log(`[Test] Favorites table rows: ${rowCount}`);
        expect(rowCount).toBeGreaterThan(0);
        
        console.log('[Test] ✅ Favorites are displayed in the Favorites tab!');
    } else {
        console.log('[Test] ❌ Banner is NOT visible on fresh install!');
        throw new Error('Recalculation banner should be visible on fresh install');
    }
});

test('Favorites tab should show banner when no favorites exist', async ({ page }) => {
    // Capture console logs
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[FavoritesTab]') || text.includes('favorites')) {
            console.log(`[BROWSER] ${text}`);
        }
    });
    
    // Clear localStorage to simulate fresh install
    await page.goto('http://localhost:5174/');
    await page.evaluate(() => {
        localStorage.clear();
    });
    
    console.log('[Test] Cleared localStorage, reloading page...');
    
    // Reload to simulate fresh install
    await page.reload();
    await page.waitForTimeout(3000);
    
    // Wait for combos to be calculated
    await page.waitForTimeout(8000);
    
    // Navigate to Favorites tab
    console.log('[Test] Navigating to Favorites tab...');
    await page.click('text=Favorites');
    await page.waitForTimeout(1000);
    
    // Check if recalculation banner is visible
    const banner = page.locator('.recalculation-banner');
    const isBannerVisible = await banner.isVisible().catch(() => false);
    
    console.log(`[Test] Recalculation banner visible on Favorites tab: ${isBannerVisible}`);
    
    if (isBannerVisible) {
        console.log('[Test] ✅ Banner is visible on Favorites tab when no favorites exist!');
    } else {
        console.log('[Test] ❌ Banner is NOT visible on Favorites tab!');
        throw new Error('Recalculation banner should be visible on Favorites tab when no favorites exist');
    }
});

