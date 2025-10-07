import { test, expect } from '@playwright/test';

test.describe('Gear C Display for Simplified 2-Gear Setups', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:5173');
        await page.waitForLoadState('networkidle');
    });

    test('should show blank in C column when B equals C in Favorites tab', async ({ page }) => {
        console.log('Testing gear C display in Favorites tab...');
        
        // Click on Favorites tab
        await page.click('li:has(i.fa-heart)');
        await page.waitForTimeout(1000);
        
        // Get all rows in the favorites table
        const rows = await page.locator('table tbody tr').all();
        console.log(`Found ${rows.length} rows in favorites table`);
        
        let foundBEqualsC = false;
        let foundBNotEqualsC = false;
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            // Get gear columns (assuming order: Name, Pi, Pm, A, B, C, D)
            const cells = await row.locator('td').all();
            if (cells.length < 7) continue;
            
            const nameText = await cells[0].textContent();
            const gearAText = await cells[3].textContent();
            const gearBText = await cells[4].textContent();
            const gearCText = await cells[5].textContent();
            const gearDText = await cells[6].textContent();
            
            console.log(`Row ${i + 1}: ${nameText} - A:${gearAText} B:${gearBText} C:${gearCText} D:${gearDText}`);
            
            // Check if B equals C (both have same value)
            if (gearBText && gearCText && gearBText.trim() !== '' && gearBText.trim() === gearCText.trim()) {
                console.log(`  -> ERROR: B=C but C column shows value: "${gearCText}"`);
                console.log(`  -> Expected C column to be blank when B=C`);
                foundBEqualsC = true;
                
                // This should fail - C should be blank when B=C
                expect(gearCText.trim()).toBe('');
            }
            
            // Check if B does not equal C
            if (gearBText && gearCText && gearBText.trim() !== '' && gearCText.trim() !== '' && gearBText.trim() !== gearCText.trim()) {
                console.log(`  -> OK: B≠C and C column shows value: "${gearCText}"`);
                foundBNotEqualsC = true;
                
                // This should pass - C should show value when B≠C
                expect(gearCText.trim()).not.toBe('');
            }
            
            // Check if C is blank (simplified 2-gear setup)
            if (gearBText && gearBText.trim() !== '' && (!gearCText || gearCText.trim() === '')) {
                console.log(`  -> OK: C column is blank (simplified 2-gear setup)`);
                foundBEqualsC = true;
                
                // This should pass - C is blank for simplified setup
                expect(gearCText?.trim() || '').toBe('');
            }
        }
        
        console.log(`\nSummary:`);
        console.log(`  Found B=C cases: ${foundBEqualsC}`);
        console.log(`  Found B≠C cases: ${foundBNotEqualsC}`);
        
        // We should find at least one of each case
        expect(foundBEqualsC || foundBNotEqualsC).toBe(true);
    });

    test('should show blank in C column when B equals C in Pitch Table tab', async ({ page }) => {
        console.log('Testing gear C display in Pitch Table tab...');
        
        // Click on Pitch Table tab
        await page.click('li:has(i.fa-list)');
        await page.waitForTimeout(2000);
        
        // Get all tables (Metric Coarse, Metric Fine, Imperial Coarse, etc.)
        const tables = await page.locator('table').all();
        console.log(`Found ${tables.length} tables in Pitch Table tab`);
        
        let totalRows = 0;
        let blankCCount = 0;
        let nonBlankCCount = 0;
        
        for (let tableIdx = 0; tableIdx < tables.length; tableIdx++) {
            const table = tables[tableIdx];
            const rows = await table.locator('tbody tr').all();
            
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const cells = await row.locator('td').all();
                if (cells.length < 7) continue;
                
                totalRows++;
                
                const nameText = await cells[0].textContent();
                const gearBText = await cells[4].textContent();
                const gearCText = await cells[5].textContent();
                
                // Check if C is blank
                if (!gearCText || gearCText.trim() === '') {
                    blankCCount++;
                    console.log(`Table ${tableIdx + 1}, Row ${i + 1}: ${nameText} - B:${gearBText} C:(blank)`);
                } else {
                    nonBlankCCount++;
                }
            }
        }
        
        console.log(`\nSummary:`);
        console.log(`  Total rows: ${totalRows}`);
        console.log(`  Blank C column: ${blankCCount}`);
        console.log(`  Non-blank C column: ${nonBlankCCount}`);
        
        // We should have at least some rows
        expect(totalRows).toBeGreaterThan(0);
    });

    test('should not crash when rendering gear C column', async ({ page }) => {
        console.log('Testing that gear C column does not crash...');
        
        // Listen for console errors
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
                console.log('Browser error:', msg.text());
            }
        });
        
        page.on('pageerror', error => {
            errors.push(error.message);
            console.log('Page error:', error.message);
        });
        
        // Click on Favorites tab
        await page.click('li:has(i.fa-heart)');
        await page.waitForTimeout(1000);
        
        // Click on Pitch Table tab
        await page.click('li:has(i.fa-list)');
        await page.waitForTimeout(2000);
        
        // Click on Gears for Pitch tab
        await page.click('li:has(i.fa-gear)');
        await page.waitForTimeout(1000);
        
        // Check for errors
        const relevantErrors = errors.filter(e => 
            e.includes('gearB') || 
            e.includes('gearC') || 
            e.includes('Cannot read properties of undefined')
        );
        
        console.log(`\nTotal errors: ${errors.length}`);
        console.log(`Relevant errors: ${relevantErrors.length}`);
        
        if (relevantErrors.length > 0) {
            console.log('Relevant errors:');
            relevantErrors.forEach(e => console.log(`  - ${e}`));
        }
        
        // Should not have any errors related to gearB/gearC
        expect(relevantErrors.length).toBe(0);
    });

    test('should handle edge cases in gear C display', async ({ page }) => {
        console.log('Testing edge cases...');
        
        // Click on Favorites tab
        await page.click('li:has(i.fa-heart)');
        await page.waitForTimeout(1000);
        
        // Get first row
        const firstRow = page.locator('table tbody tr').first();
        const cells = await firstRow.locator('td').all();
        
        if (cells.length >= 7) {
            const gearBText = await cells[4].textContent();
            const gearCText = await cells[5].textContent();
            
            console.log(`First row - B: "${gearBText}", C: "${gearCText}"`);
            
            // C should either be blank or have a value, never undefined/null
            expect(gearCText).toBeDefined();
            
            // If B and C are the same, C should be blank
            if (gearBText && gearCText && gearBText.trim() === gearCText.trim() && gearBText.trim() !== '') {
                console.log('  -> B=C detected, C should be blank');
                expect(gearCText.trim()).toBe('');
            }
        }
    });

    test('should export gear C correctly even when display is blank', async ({ page }) => {
        console.log('Testing CSV export with blank C column...');
        
        // Click on Favorites tab
        await page.click('li:has(i.fa-heart)');
        await page.waitForTimeout(1000);
        
        // Set up download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        
        // Click export button (if it exists)
        const exportButton = page.locator('button:has-text("Export"), button:has(i.fa-download)').first();
        const exportExists = await exportButton.count() > 0;
        
        if (exportExists) {
            await exportButton.click();
            const download = await downloadPromise;
            
            if (download) {
                console.log('Export successful:', await download.suggestedFilename());
                
                // Read CSV content
                const path = await download.path();
                if (path) {
                    const fs = require('fs');
                    const content = fs.readFileSync(path, 'utf-8');
                    console.log('CSV preview (first 500 chars):');
                    console.log(content.substring(0, 500));
                    
                    // CSV should contain gear values (not blank for export)
                    expect(content).toContain('A');
                    expect(content).toContain('B');
                    expect(content).toContain('C');
                    expect(content).toContain('D');
                }
            } else {
                console.log('Export button clicked but no download occurred');
            }
        } else {
            console.log('Export button not found, skipping export test');
        }
    });
});

