import { test, expect } from '@playwright/test';

test.describe('Missing Combinations - 40, 65, 65, 30 for 12 TPI', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5174/');
        await page.waitForLoadState('networkidle');
    });

    test('should generate 40, 65, 65, 30 combination after calculating gear ratios', async ({ page }) => {
        // Step 1: Go to Setup tab
        await page.click('text=Setup');
        await page.waitForTimeout(500);

        // Step 2: Click "Calculate gear ratios"
        const calculateButton = page.locator('button:has-text("Calculate gear ratios")');
        await expect(calculateButton).toBeVisible();
        await calculateButton.click();

        // Wait for calculation to complete (look for success message or button to re-enable)
        await page.waitForTimeout(2000); // Give it time to calculate

        // Step 3: Go to "Gears for Pitch" tab
        await page.click('text=Gears for Pitch');
        await page.waitForTimeout(500);

        // Step 4: Enter 12 TPI
        // First, make sure we're in TPI mode
        const pitchTypeSelect = page.locator('select').first();
        await pitchTypeSelect.selectOption({ label: 'TPI' });
        await page.waitForTimeout(200);

        // Enter 12 in the pitch input
        const pitchInput = page.locator('input[type="number"]').first();
        await pitchInput.clear();
        await pitchInput.fill('12');
        await page.waitForTimeout(500);

        // Step 5: Check if 40, 65, 65, 30 appears in the results
        const tableRows = page.locator('table tbody tr');
        const rowCount = await tableRows.count();

        console.log(`Found ${rowCount} rows for 12 TPI`);

        // Look for the specific combination
        let found = false;
        for (let i = 0; i < rowCount; i++) {
            const row = tableRows.nth(i);
            const cells = row.locator('td');
            const cellCount = await cells.count();

            if (cellCount >= 4) {
                // Get gear values (assuming columns are A, B, C, D)
                const gearAText = await cells.nth(0).textContent();
                const gearBText = await cells.nth(1).textContent();
                const gearCText = await cells.nth(2).textContent();
                const gearDText = await cells.nth(3).textContent();

                // Extract numbers from text (e.g., "M1Z40" -> 40)
                const gearA = parseInt(gearAText?.match(/\d+/)?.[0] || '0');
                const gearB = parseInt(gearBText?.match(/\d+/)?.[0] || '0');
                const gearC = parseInt(gearCText?.match(/\d+/)?.[0] || '0');
                const gearD = parseInt(gearDText?.match(/\d+/)?.[0] || '0');

                console.log(`Row ${i}: ${gearA}, ${gearB}, ${gearC}, ${gearD}`);

                if (gearA === 40 && gearB === 65 && gearC === 65 && gearD === 30) {
                    found = true;
                    console.log('✅ Found 40, 65, 65, 30!');
                    break;
                }
            }
        }

        expect(found).toBe(true);
    });

    test('should show 40, 65, 65, 30 produces exactly 12.000 TPI', async ({ page }) => {
        // Open the test page
        await page.goto('http://localhost:5174/test-12tpi.html');
        await page.waitForLoadState('networkidle');

        // Click "Run Test"
        await page.click('button:has-text("Run Test")');
        await page.waitForTimeout(1000);

        // Check for success message
        const successMessage = page.locator('text=✅ SUCCESS: 40, 65, 65, 30 produces exactly 12 TPI!');
        await expect(successMessage).toBeVisible();

        // Check the TPI value
        const tpiResult = page.locator('text=TPI: 12.000000');
        await expect(tpiResult).toBeVisible();
    });

    test('should verify formula produces correct results', async ({ page }) => {
        // Test multiple combinations
        const testCases = [
            { gears: [40, 65, 65, 30], expectedTPI: 12.0, leadscrew: 16 },
            { gears: [20, 50, 40, 80], expectedTPI: 80.0, leadscrew: 16 },
            { gears: [40, 40, 40, 20], expectedTPI: 8.0, leadscrew: 16 },
        ];

        for (const testCase of testCases) {
            const [A, B, C, D] = testCase.gears;
            const ratio = (A * C) / (B * D);
            const tpi = testCase.leadscrew / ratio;

            console.log(`${A}, ${B}, ${C}, ${D} → ${tpi.toFixed(6)} TPI (expected: ${testCase.expectedTPI})`);

            expect(Math.abs(tpi - testCase.expectedTPI)).toBeLessThan(0.001);
        }
    });

    test('should update Gears for Pitch tab when combos are recalculated', async ({ page }) => {
        // Step 1: Go to "Gears for Pitch" tab first (before calculating)
        await page.click('text=Gears for Pitch');
        await page.waitForTimeout(500);

        // Enter 12 TPI
        const pitchTypeSelect = page.locator('select').first();
        await pitchTypeSelect.selectOption({ label: 'TPI' });
        const pitchInput = page.locator('input[type="number"]').first();
        await pitchInput.clear();
        await pitchInput.fill('12');
        await page.waitForTimeout(500);

        // Should show no results or old results
        const tableRowsBefore = page.locator('table tbody tr');
        const rowCountBefore = await tableRowsBefore.count();
        console.log(`Rows before calculation: ${rowCountBefore}`);

        // Step 2: Go to Setup and calculate
        await page.click('text=Setup');
        await page.waitForTimeout(500);

        const calculateButton = page.locator('button:has-text("Calculate gear ratios")');
        await calculateButton.click();
        await page.waitForTimeout(2000);

        // Step 3: Go back to "Gears for Pitch" tab
        await page.click('text=Gears for Pitch');
        await page.waitForTimeout(500);

        // Should now show results
        const tableRowsAfter = page.locator('table tbody tr');
        const rowCountAfter = await tableRowsAfter.count();
        console.log(`Rows after calculation: ${rowCountAfter}`);

        // Should have more rows after calculation
        expect(rowCountAfter).toBeGreaterThan(0);
    });
});

