import { test, expect } from '@playwright/test';

test.describe('Favorites PM Column', () => {
    test.beforeEach(async ({ page }) => {
        // Listen to console messages
        page.on('console', msg => {
            if (msg.text().includes('[PitchTableTab]')) {
                console.log('Browser console:', msg.text());
            }
        });

        // Navigate to the app and clear favorites
        await page.goto('http://localhost:5174');
        await page.evaluate(() => {
            localStorage.removeItem('favorites');
        });

        // Reload and visit Pitch Table tab to regenerate favorites
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Click on Pitch Table tab to trigger favorite generation
        await page.click('text=Pitch Table');
        await page.waitForTimeout(3000); // Wait for favorites to be generated

        // Click on Favorites tab
        await page.click('text=Favorites');
        await page.waitForTimeout(1000);
    });

    test('should show PM column with correct formatting', async ({ page }) => {
        // Get all rows in the favorites table
        const rows = await page.locator('table tbody tr').all();
        
        console.log(`Found ${rows.length} rows in favorites table`);

        // Find imperial threads
        let imperialCount = 0;
        for (let i = 0; i < rows.length; i++) {
            const nameCell = await rows[i].locator('td').nth(0).textContent();
            if (nameCell?.startsWith('UNC') || nameCell?.startsWith('UNF')) {
                imperialCount++;
                console.log(`Found imperial thread at row ${i + 1}: ${nameCell}`);
            }
        }
        console.log(`Total imperial threads found: ${imperialCount}`);

        // Check first 5 metric threads and first 5 imperial threads
        const rowsToCheck = [0, 1, 2, 3, 4, 19, 20, 21, 22, 23]; // M2-M6, UNC #0-UNC #2
        for (const i of rowsToCheck) {
            if (i >= rows.length) continue;
            const row = rows[i];
            
            // Get the name column (first column)
            const nameCell = await row.locator('td').nth(0).textContent();
            
            // Get the Pi column (second column)
            const piCell = await row.locator('td').nth(1);
            const piHTML = await piCell.innerHTML();
            const piText = await piCell.textContent();
            
            // Get the Pm column (third column)
            const pmCell = await row.locator('td').nth(2);
            const pmHTML = await pmCell.innerHTML();
            const pmText = await pmCell.textContent();
            
            console.log(`\nRow ${i + 1}: ${nameCell}`);
            console.log(`  Pi HTML: ${piHTML}`);
            console.log(`  Pi Text: ${piText}`);
            console.log(`  Pm HTML: ${pmHTML}`);
            console.log(`  Pm Text: ${pmText}`);
            
            // Check if it's a metric thread (M2, M3, etc.)
            if (nameCell?.startsWith('M')) {
                console.log(`  -> Metric thread detected`);
                
                // Pi should show TPI (converted, greyed)
                expect(piText).toContain('TPI');
                expect(piHTML).toContain('opacity: 0.5');
                
                // Pm should show mm/rev (native, not greyed)
                expect(pmText).toContain('mm/rev');
                expect(pmHTML).not.toContain('opacity: 0.5');
            }
            
            // Check if it's an imperial thread (UNC, UNF, etc.)
            if (nameCell?.startsWith('UNC') || nameCell?.startsWith('UNF')) {
                console.log(`  -> Imperial thread detected`);
                console.log(`  -> Pi should be NORMAL (not greyed)`);
                console.log(`  -> Pm should be GREYED`);

                // Pi should show TPI (native, not greyed)
                expect(piText).toContain('TPI');
                if (piHTML.includes('opacity: 0.5')) {
                    console.log(`  -> ERROR: Pi is greyed but should be normal!`);
                }
                expect(piHTML).not.toContain('opacity: 0.5');

                // Pm should show mm/rev (converted, greyed)
                expect(pmText).toContain('mm/rev');
                if (!pmHTML.includes('opacity: 0.5')) {
                    console.log(`  -> ERROR: Pm is normal but should be greyed!`);
                }
                expect(pmHTML).toContain('opacity: 0.5');
            }
        }
    });

    test('should check pitch type in data', async ({ page }) => {
        // Inject a script to check the actual pitch data
        const pitchData = await page.evaluate(() => {
            // Try to get favorites from localStorage
            const favoritesStr = localStorage.getItem('favorites');
            if (!favoritesStr) return null;

            const favorites = JSON.parse(favoritesStr);
            // Get first 5 metric and first 5 imperial
            const metricSamples = favorites.slice(0, 5);
            const imperialSamples = favorites.slice(19, 24); // UNC #0 to UNC #2

            return {
                metric: metricSamples.map((fav: any) => ({
                    name: fav.name,
                    pitchValue: fav.pitch?.value,
                    pitchType: fav.pitch?.type,
                    pitchTypeStr: fav.pitch?.type === 0 ? 'Metric' : fav.pitch?.type === 1 ? 'Imperial' : 'Unknown'
                })),
                imperial: imperialSamples.map((fav: any) => ({
                    name: fav.name,
                    pitchValue: fav.pitch?.value,
                    pitchType: fav.pitch?.type,
                    pitchTypeStr: fav.pitch?.type === 0 ? 'Metric' : fav.pitch?.type === 1 ? 'Imperial' : 'Unknown'
                }))
            };
        });

        console.log('\nPitch data from localStorage:');
        console.log('Metric samples:');
        console.log(JSON.stringify(pitchData?.metric, null, 2));
        console.log('\nImperial samples:');
        console.log(JSON.stringify(pitchData?.imperial, null, 2));
    });
});

