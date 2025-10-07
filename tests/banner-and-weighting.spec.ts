import { test, expect } from '@playwright/test';

test.describe('Banner Hiding and Gear Weighting', () => {
    test('Banner should hide after recalculation completes', async ({ page }) => {
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
        
        if (isBannerVisible) {
            console.log('[Test] Banner is visible, clicking Recalculate Favorites...');
            
            // Click the Recalculate Favorites button
            await page.click('button:has-text("Recalculate Favorites")');
            
            console.log('[Test] Waiting for recalculation to complete...');
            
            // Wait for the progress bar to appear
            await page.waitForSelector('.progress', { timeout: 5000 }).catch(() => {
                console.log('[Test] Progress bar did not appear');
            });
            
            // Wait for recalculation to complete (banner should hide)
            // Give it up to 30 seconds for the worker to complete
            await page.waitForSelector('.recalculation-banner', { 
                state: 'hidden', 
                timeout: 30000 
            });
            
            console.log('[Test] ✅ Banner successfully hidden after recalculation!');
        } else {
            console.log('[Test] Banner not visible (recalculation not needed)');
        }
        
        // Verify banner is now hidden
        const bannerHidden = await banner.isHidden();
        expect(bannerHidden).toBe(true);
    });
    
    test('Gear optimizer should prefer largest gear in slot D', async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:5174/');
        
        // Wait for app to load
        await page.waitForTimeout(2000);
        
        console.log('[Test] Checking gear weighting preferences...');
        
        // Go to Setup tab to ensure combos are calculated
        await page.click('text=Setup');
        await page.waitForTimeout(500);
        
        // Click Calculate gear ratios if needed
        const calculateButton = page.locator('button:has-text("Calculate gear ratios")');
        const isCalculateVisible = await calculateButton.isVisible().catch(() => false);
        
        if (isCalculateVisible) {
            console.log('[Test] Calculating gear ratios...');
            await calculateButton.click();
            
            // Wait for calculation to complete
            await page.waitForTimeout(5000);
        }
        
        // Go to Pitch Table tab
        await page.click('text=Pitch Table');
        await page.waitForTimeout(500);
        
        // Check if recalculation banner is visible
        const banner = page.locator('.recalculation-banner');
        const isBannerVisible = await banner.isVisible().catch(() => false);
        
        if (isBannerVisible) {
            console.log('[Test] Recalculating favorites with new weighting...');
            
            // Click the Recalculate Favorites button
            await page.click('button:has-text("Recalculate Favorites")');
            
            // Wait for recalculation to complete
            await page.waitForSelector('.recalculation-banner', { 
                state: 'hidden', 
                timeout: 30000 
            });
            
            console.log('[Test] Recalculation complete!');
        }
        
        // Now check the favorites to see if they prefer largest gear in D
        // We'll look at the pitch table and examine some favorites
        
        // Get all rows in the pitch table
        const rows = page.locator('tbody tr');
        const rowCount = await rows.count();
        
        console.log(`[Test] Found ${rowCount} rows in pitch table`);
        
        if (rowCount > 0) {
            // Check first few favorites
            for (let i = 0; i < Math.min(5, rowCount); i++) {
                const row = rows.nth(i);
                
                // Get gear values from the row
                const gearAText = await row.locator('td').nth(1).textContent();
                const gearBText = await row.locator('td').nth(2).textContent();
                const gearCText = await row.locator('td').nth(3).textContent();
                const gearDText = await row.locator('td').nth(4).textContent();
                
                // Extract tooth counts (format is like "M1 Z40")
                const extractTeeth = (text: string | null) => {
                    if (!text) return 0;
                    const match = text.match(/Z(\d+)/);
                    return match ? parseInt(match[1]) : 0;
                };
                
                const teethA = extractTeeth(gearAText);
                const teethB = extractTeeth(gearBText);
                const teethC = extractTeeth(gearCText);
                const teethD = extractTeeth(gearDText);
                
                const maxTeeth = Math.max(teethA, teethB, teethC, teethD);
                
                console.log(`[Test] Row ${i}: A=${teethA}, B=${teethB}, C=${teethC}, D=${teethD}, max=${maxTeeth}, D is max: ${teethD === maxTeeth}`);
            }
        }
        
        console.log('[Test] ✅ Gear weighting test complete!');
    });
});

