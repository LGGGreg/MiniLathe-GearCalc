import { test, expect } from '@playwright/test';

test('Debug banner hiding issue', async ({ page }) => {
    // Capture console logs
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[RecalculationBanner]') || text.includes('[PitchTableTab]') || text.includes('needsRecalculation')) {
            console.log(`[BROWSER] ${text}`);
        }
    });
    
    // Navigate to the app
    await page.goto('http://localhost:5174/');
    
    // Wait for app to load
    await page.waitForTimeout(2000);
    
    console.log('[Test] Navigating to Pitch Table tab...');
    
    // Click on Pitch Table tab
    await page.click('text=Pitch Table');
    await page.waitForTimeout(500);
    
    console.log('[Test] Looking for recalculation banner...');
    
    // Check if banner is visible
    const banner = page.locator('.recalculation-banner');
    const isBannerVisible = await banner.isVisible().catch(() => false);
    
    console.log(`[Test] Banner visible: ${isBannerVisible}`);
    
    if (isBannerVisible) {
        console.log('[Test] Clicking Recalculate Favorites...');
        
        // Click the Recalculate Favorites button
        await page.click('button:has-text("Recalculate Favorites")');
        
        console.log('[Test] Waiting for recalculation to complete...');

        // Wait for progress to reach 100%
        await page.waitForTimeout(70000); // Give it 70 seconds (worker timeout is 60s)

        // Check banner visibility
        const stillVisible = await banner.isVisible();
        console.log(`[Test] Banner still visible after 70s: ${stillVisible}`);
        
        // Dump the HTML of the banner
        const bannerHTML = await banner.innerHTML().catch(() => 'Banner not found');
        console.log(`[Test] Banner HTML: ${bannerHTML}`);
        
        // Check the computed property value
        const needsRecalc = await page.evaluate(() => {
            // @ts-ignore
            return window.GlobalConfig?.needsRecalculation;
        });
        console.log(`[Test] GlobalConfig.needsRecalculation: ${needsRecalc}`);
    }
});

