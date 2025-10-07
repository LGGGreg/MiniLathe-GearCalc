import { test, expect } from '@playwright/test';

test.describe('Find 40, 65, 65, 30 in UI', () => {
    test('should find 40, 65, 65, 30 for 12 TPI after calculating', async ({ page }) => {
        await page.goto('http://localhost:5174/');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000); // Wait for app to initialize

        // Dump HTML to see what's on the page
        const html = await page.content();
        console.log('Page loaded, checking for tabs...');

        // Step 1: Go to Setup tab and calculate
        console.log('Step 1: Going to Setup tab...');
        const setupTab = page.locator('button:has-text("Setup"), a:has-text("Setup"), [role="tab"]:has-text("Setup")').first();
        await setupTab.click({ timeout: 10000 });
        await page.waitForTimeout(1000);

        console.log('Step 2: Clicking Calculate gear ratios...');
        const calculateButton = page.locator('button:has-text("Calculate gear ratios")');
        await expect(calculateButton).toBeVisible({ timeout: 5000 });
        await calculateButton.click();

        // Wait for calculation to complete
        console.log('Step 3: Waiting for calculation...');
        await page.waitForTimeout(5000); // Give it time to calculate

        // Step 2: Go to "Gears for Pitch" tab
        console.log('Step 4: Going to Gears for Pitch tab...');
        const gearsForPitchTab = page.locator('button:has-text("Gears for Pitch"), a:has-text("Gears for Pitch"), [role="tab"]:has-text("Gears for Pitch")').first();
        await gearsForPitchTab.click({ timeout: 10000 });
        await page.waitForTimeout(1000);

        // Step 3: Select TPI mode
        console.log('Step 5: Selecting TPI mode...');
        const tpiRadio = page.locator('input[type="radio"][value="1"]'); // Imperial = 1
        await tpiRadio.check();
        await page.waitForTimeout(500);

        // Step 4: Enter 12
        console.log('Step 6: Entering 12 TPI...');
        const pitchInput = page.locator('input[type="number"]').first();
        await pitchInput.clear();
        await pitchInput.fill('12');
        await pitchInput.press('Enter');
        await page.waitForTimeout(1000);

        // Step 5: Get all rows
        console.log('Step 7: Checking results...');
        const table = page.locator('table').first();
        await expect(table).toBeVisible({ timeout: 5000 });

        const rows = table.locator('tbody tr');
        const rowCount = await rows.count();
        console.log(`Found ${rowCount} rows`);

        // Print all rows to see what we have
        const allCombinations: any[] = [];
        for (let i = 0; i < Math.min(rowCount, 50); i++) {
            const row = rows.nth(i);
            const cells = row.locator('td');
            
            // Get text from each cell
            const cellTexts: string[] = [];
            const cellCount = await cells.count();
            for (let j = 0; j < cellCount; j++) {
                const text = await cells.nth(j).textContent();
                cellTexts.push(text || '');
            }

            // Try to extract gear numbers
            // Assuming columns are: Pi, Pm, A, B, C, D
            if (cellTexts.length >= 6) {
                const extractNumber = (text: string) => {
                    const match = text.match(/(\d+)/);
                    return match ? parseInt(match[1]) : 0;
                };

                const gearA = extractNumber(cellTexts[2]);
                const gearB = extractNumber(cellTexts[3]);
                const gearC = extractNumber(cellTexts[4]);
                const gearD = extractNumber(cellTexts[5]);

                allCombinations.push({ A: gearA, B: gearB, C: gearC, D: gearD });
                
                if (i < 20) {
                    console.log(`Row ${i}: ${gearA}, ${gearB}, ${gearC}, ${gearD}`);
                }
            }
        }

        // Check if 40, 65, 65, 30 exists
        const found = allCombinations.some(c => 
            c.A === 40 && c.B === 65 && c.C === 65 && c.D === 30
        );

        console.log('');
        console.log('=== Search Results ===');
        console.log(`Looking for: 40, 65, 65, 30`);
        console.log(`Found: ${found ? '✅ YES' : '❌ NO'}`);
        console.log('');

        // Check for similar combinations
        const with40_30 = allCombinations.filter(c => c.A === 40 && c.D === 30);
        console.log(`Combinations with A=40, D=30: ${with40_30.length}`);
        with40_30.forEach(c => {
            console.log(`  ${c.A}, ${c.B}, ${c.C}, ${c.D}`);
        });

        const with65 = allCombinations.filter(c => c.B === 65 || c.C === 65);
        console.log(`Combinations with 65T gear: ${with65.length}`);
        with65.slice(0, 10).forEach(c => {
            console.log(`  ${c.A}, ${c.B}, ${c.C}, ${c.D}`);
        });

        // Take a screenshot
        await page.screenshot({ path: 'test-results/gears-for-pitch-12tpi.png', fullPage: true });
        console.log('Screenshot saved to test-results/gears-for-pitch-12tpi.png');

        // This should pass!
        expect(found).toBe(true);
    });

    test('should check if 65T gear is in the gear collection', async ({ page }) => {
        await page.goto('http://localhost:5174/');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        // Go to Setup tab
        const setupTab = page.locator('button:has-text("Setup"), a:has-text("Setup"), [role="tab"]:has-text("Setup")').first();
        await setupTab.click({ timeout: 10000 });
        await page.waitForTimeout(1000);

        // Click Edit button
        const editButton = page.locator('button:has-text("Edit")');
        await editButton.click();
        await page.waitForTimeout(500);

        // Look for gear collection display
        // This might be in a modal or section
        const gearText = await page.textContent('body');
        
        console.log('Checking if 65 appears in gear collection...');
        const has65 = gearText?.includes('65') || false;
        console.log(`Has 65T gear: ${has65 ? '✅ YES' : '❌ NO'}`);

        // Take a screenshot
        await page.screenshot({ path: 'test-results/setup-edit.png', fullPage: true });
        console.log('Screenshot saved to test-results/setup-edit.png');
    });
});

