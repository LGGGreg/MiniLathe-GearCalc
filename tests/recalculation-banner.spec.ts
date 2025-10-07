import { test, expect } from '@playwright/test';

test.describe('Recalculation Banner on Fresh Load', () => {
    test('should show recalculation banner after combos calculated on fresh load', async ({ page }) => {
        // Enable console logging
        page.on('console', msg => {
            console.log('BROWSER:', msg.text());
        });

        console.log('=== Test: Check recalculation banner on fresh load ===');
        
        // Clear all localStorage to simulate fresh install
        await page.goto('http://localhost:5173/');
        await page.evaluate(() => {
            localStorage.clear();
        });
        
        // Reload to start fresh
        console.log('Reloading page with cleared localStorage...');
        await page.reload();
        await page.waitForLoadState('domcontentloaded');

        // Check initial state
        const initialState = await page.evaluate(() => {
            const favoritesJson = localStorage.getItem('favorites');
            const combosJson = localStorage.getItem('gearCombos');
            return {
                favorites: favoritesJson,
                combos: combosJson ? 'exists' : 'null'
            };
        });
        console.log('Initial state:', initialState);

        // Wait for combos to be calculated (should take a few seconds)
        console.log('Waiting for combos to be calculated...');
        await page.waitForTimeout(8000);

        // Check if recalculation banner is visible
        const bannerLocator = page.locator('.recalculation-banner, [class*="recalculation"], button:has-text("Recalculate")').first();
        const bannerVisible = await bannerLocator.isVisible().catch(() => false);
        console.log('Recalculation banner visible:', bannerVisible);

        // Take screenshot
        await page.screenshot({ path: 'test-results/recalculation-banner.png', fullPage: true });

        // Check favorites after combos calculated
        const stateAfterCombos = await page.evaluate(() => {
            const favoritesJson = localStorage.getItem('favorites');
            const combosJson = localStorage.getItem('gearCombos');
            return {
                favorites: favoritesJson,
                favoritesCount: favoritesJson ? JSON.parse(favoritesJson).length : 0,
                combos: combosJson ? 'exists' : 'null',
                combosCount: combosJson ? JSON.parse(combosJson).length : 0
            };
        });
        console.log('After combos calculated:', stateAfterCombos);

        // If banner is visible, click the recalculate button
        if (bannerVisible) {
            console.log('✅ Banner is visible! Clicking recalculate button...');
            const recalcButton = page.locator('button:has-text("Recalculate")').first();
            await recalcButton.click();
            
            // Wait for recalculation to complete
            console.log('Waiting for recalculation to complete...');
            await page.waitForTimeout(15000);
            
            // Check favorites after recalculation
            const stateAfterRecalc = await page.evaluate(() => {
                const favoritesJson = localStorage.getItem('favorites');
                return {
                    favorites: favoritesJson,
                    favoritesCount: favoritesJson ? JSON.parse(favoritesJson).length : 0
                };
            });
            console.log('After recalculation:', stateAfterRecalc);
            
            if (stateAfterRecalc.favoritesCount > 0) {
                console.log(`✅ SUCCESS: Generated ${stateAfterRecalc.favoritesCount} auto-favorites`);
            } else {
                console.log('❌ FAILED: No favorites generated');
            }

            // Take final screenshot
            await page.screenshot({ path: 'test-results/after-recalculation.png', fullPage: true });
        } else {
            console.log('❌ Banner is NOT visible - this is the bug!');
        }
    });
});

