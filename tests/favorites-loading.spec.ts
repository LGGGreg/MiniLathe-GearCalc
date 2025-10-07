import { test, expect } from '@playwright/test';

test.describe('Favorites Loading Debug', () => {
    test('should trace favorites loading sequence', async ({ page }) => {
        // Enable console logging
        page.on('console', msg => {
            console.log('BROWSER:', msg.text());
        });

        console.log('=== Starting test ===');

        await page.goto('http://localhost:5173/');
        await page.waitForLoadState('domcontentloaded');
        
        console.log('=== Page loaded, checking initial state ===');
        
        // Check localStorage immediately
        const initialState = await page.evaluate(() => {
            const favoritesJson = localStorage.getItem('favorites');
            const combosJson = localStorage.getItem('gearCombos');
            
            return {
                favoritesInStorage: favoritesJson,
                favoritesLength: favoritesJson ? JSON.parse(favoritesJson).length : 0,
                combosInStorage: combosJson ? 'exists' : 'null',
                combosLength: combosJson ? JSON.parse(combosJson).length : 0,
            };
        });

        console.log('Initial state:');
        console.log('  Favorites in storage:', initialState.favoritesInStorage);
        console.log('  Favorites length:', initialState.favoritesLength);
        console.log('  Combos in storage:', initialState.combosInStorage);
        console.log('  Combos length:', initialState.combosLength);

        // Wait for app to initialize
        console.log('=== Waiting 2 seconds ===');
        await page.waitForTimeout(2000);

        const afterWait = await page.evaluate(() => {
            const favoritesJson = localStorage.getItem('favorites');
            return {
                favoritesInStorage: favoritesJson,
                favoritesLength: favoritesJson ? JSON.parse(favoritesJson).length : 0,
            };
        });

        console.log('After 2 seconds:');
        console.log('  Favorites in storage:', afterWait.favoritesInStorage);
        console.log('  Favorites length:', afterWait.favoritesLength);

        // Wait more
        console.log('=== Waiting 5 more seconds ===');
        await page.waitForTimeout(5000);

        const afterLongWait = await page.evaluate(() => {
            const favoritesJson = localStorage.getItem('favorites');
            return {
                favoritesInStorage: favoritesJson,
                favoritesLength: favoritesJson ? JSON.parse(favoritesJson).length : 0,
            };
        });

        console.log('After 7 seconds total:');
        console.log('  Favorites in storage:', afterLongWait.favoritesInStorage);
        console.log('  Favorites length:', afterLongWait.favoritesLength);

        // Take screenshot
        await page.screenshot({ path: 'test-results/favorites-loading-debug.png', fullPage: true });
    });

    test('should manually add favorite and check if it persists', async ({ page }) => {
        console.log('=== Test: Add favorite and reload ===');

        await page.goto('http://localhost:5173/');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(3000);

        // Clear combos to force recalculation on next load
        console.log('Step 1: Clearing combos and adding favorite...');
        await page.evaluate(() => {
            const favorite = {
                gearA: 'M1Z40',
                gearB: 'M1Z65',
                gearC: 'M1Z65',
                gearD: 'M1Z30',
                pitch: { value: 12, type: 1 }
            };
            localStorage.setItem('favorites', JSON.stringify([favorite]));
            // Clear combos to force recalculation
            localStorage.removeItem('gearCombos');
        });

        const afterAdd = await page.evaluate(() => {
            return localStorage.getItem('favorites');
        });
        console.log('Favorites after manual add:', afterAdd);

        // Reload page
        console.log('Step 2: Reloading page...');
        await page.reload();
        await page.waitForLoadState('domcontentloaded');
        
        // Check immediately after reload
        const afterReloadImmediate = await page.evaluate(() => {
            return localStorage.getItem('favorites');
        });
        console.log('Favorites immediately after reload:', afterReloadImmediate);

        await page.waitForTimeout(2000);

        const afterReload2sec = await page.evaluate(() => {
            return localStorage.getItem('favorites');
        });
        console.log('Favorites 2 seconds after reload:', afterReload2sec);

        await page.waitForTimeout(5000);

        const afterReload7sec = await page.evaluate(() => {
            return localStorage.getItem('favorites');
        });
        console.log('Favorites 7 seconds after reload:', afterReload7sec);

        // Check if it was cleared
        if (afterReload7sec === '[]' || afterReload7sec === null) {
            console.log('❌ FAVORITES WERE CLEARED!');
        } else {
            console.log('✅ Favorites still present');
        }
    });
});

