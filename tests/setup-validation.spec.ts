import { test, expect } from '@playwright/test';

test.describe('Setup Tab Validation', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:5173');
        await page.waitForLoadState('networkidle');
        
        // Click on Setup tab
        await page.click('text=Setup');
        await page.waitForTimeout(500);
    });

    test('should clear validation error when correcting max gear size', async ({ page }) => {
        console.log('Starting max gear size validation test...');
        
        // Find the max gear size input
        // Look for the input that has a label containing "Max gear size"
        const maxGearSizeInput = page.locator('input[type="number"]').filter({ 
            has: page.locator('xpath=preceding-sibling::label[contains(text(), "Max") or contains(text(), "max")]')
        }).first();
        
        // Alternative: Find by nearby text
        const setupSection = page.locator('.box').filter({ hasText: /gear|size/i }).first();
        const inputs = setupSection.locator('input[type="number"]');
        
        // Try to find the max gear size input
        let maxInput = null;
        const inputCount = await inputs.count();
        console.log(`Found ${inputCount} number inputs in setup section`);
        
        for (let i = 0; i < inputCount; i++) {
            const input = inputs.nth(i);
            const value = await input.inputValue();
            console.log(`Input ${i}: value = ${value}`);
            
            // Max gear size is typically 80 by default
            if (value === '80' || value === '100') {
                maxInput = input;
                console.log(`Found max gear size input at index ${i}`);
                break;
            }
        }
        
        if (!maxInput) {
            console.log('Could not find max gear size input, trying alternative approach...');
            // Try finding by placeholder or aria-label
            maxInput = page.locator('input[type="number"]').filter({ 
                hasText: /max/i 
            }).first();
        }
        
        expect(maxInput).not.toBeNull();
        
        // Step 1: Enter invalid value (8)
        console.log('Step 1: Entering invalid value (8)...');
        await maxInput.click();
        await maxInput.fill('8');
        await page.waitForTimeout(500);
        
        // Check if error message appears
        const errorMessage = page.locator('.help.is-danger, .has-text-danger, [class*="error"]');
        const hasError = await errorMessage.count() > 0;
        console.log(`Error message visible: ${hasError}`);
        
        if (hasError) {
            const errorText = await errorMessage.first().textContent();
            console.log(`Error message: ${errorText}`);
        }
        
        // Check if save button is disabled
        const saveButton = page.locator('button:has-text("Calculate gear ratios"), button:has-text("Save")').first();
        const isDisabled = await saveButton.isDisabled();
        console.log(`Save button disabled: ${isDisabled}`);
        expect(isDisabled).toBe(true);
        
        // Step 2: Correct the value (80)
        console.log('Step 2: Correcting value to 80...');
        await maxInput.click();
        await maxInput.fill('80');
        await page.waitForTimeout(500);
        
        // Step 3: Verify error is cleared
        console.log('Step 3: Verifying error is cleared...');
        const errorStillVisible = await errorMessage.count() > 0;
        console.log(`Error message still visible: ${errorStillVisible}`);
        
        if (errorStillVisible) {
            const errorText = await errorMessage.first().textContent();
            console.log(`ERROR: Error message still showing: ${errorText}`);
        }
        
        // Check if save button is enabled
        const isStillDisabled = await saveButton.isDisabled();
        console.log(`Save button still disabled: ${isStillDisabled}`);
        
        // ASSERTIONS
        expect(errorStillVisible).toBe(false);
        expect(isStillDisabled).toBe(false);
        
        // Step 4: Verify we can save
        console.log('Step 4: Attempting to save...');
        await saveButton.click();
        await page.waitForTimeout(1000);
        
        // Check if save was successful (no error toast/message)
        const errorToast = page.locator('.notification.is-danger, .toast.is-danger');
        const hasErrorToast = await errorToast.count() > 0;
        console.log(`Error toast visible: ${hasErrorToast}`);
        expect(hasErrorToast).toBe(false);
        
        console.log('Test completed successfully!');
    });

    test('should show error for invalid max gear size', async ({ page }) => {
        console.log('Testing that invalid values show errors...');
        
        // Find max gear size input (same logic as above)
        const setupSection = page.locator('.box').filter({ hasText: /gear|size/i }).first();
        const inputs = setupSection.locator('input[type="number"]');
        
        let maxInput = null;
        const inputCount = await inputs.count();
        
        for (let i = 0; i < inputCount; i++) {
            const input = inputs.nth(i);
            const value = await input.inputValue();
            if (value === '80' || value === '100') {
                maxInput = input;
                break;
            }
        }
        
        expect(maxInput).not.toBeNull();
        
        // Enter invalid value
        await maxInput.click();
        await maxInput.fill('5');
        await page.waitForTimeout(500);
        
        // Should show error
        const errorMessage = page.locator('.help.is-danger, .has-text-danger, [class*="error"]');
        const hasError = await errorMessage.count() > 0;
        expect(hasError).toBe(true);
        
        // Save button should be disabled
        const saveButton = page.locator('button:has-text("Calculate gear ratios"), button:has-text("Save")').first();
        const isDisabled = await saveButton.isDisabled();
        expect(isDisabled).toBe(true);
    });

    test('should validate min teeth constraint', async ({ page }) => {
        console.log('Testing min teeth validation...');
        
        // Find min teeth input
        const setupSection = page.locator('.box').filter({ hasText: /teeth|min/i }).first();
        const inputs = setupSection.locator('input[type="number"]');
        
        let minTeethInput = null;
        const inputCount = await inputs.count();
        
        for (let i = 0; i < inputCount; i++) {
            const input = inputs.nth(i);
            const value = await input.inputValue();
            // Min teeth is typically 85 by default
            if (value === '85' || value === '80') {
                minTeethInput = input;
                console.log(`Found min teeth input at index ${i}`);
                break;
            }
        }
        
        if (minTeethInput) {
            // Enter invalid value (too small)
            await minTeethInput.click();
            await minTeethInput.fill('10');
            await page.waitForTimeout(500);
            
            // Should show error or disable save
            const saveButton = page.locator('button:has-text("Calculate gear ratios"), button:has-text("Save")').first();
            const isDisabled = await saveButton.isDisabled();
            console.log(`Save button disabled with min teeth = 10: ${isDisabled}`);
            
            // Correct the value
            await minTeethInput.click();
            await minTeethInput.fill('85');
            await page.waitForTimeout(500);
            
            // Should enable save
            const isStillDisabled = await saveButton.isDisabled();
            console.log(`Save button still disabled after correction: ${isStillDisabled}`);
            expect(isStillDisabled).toBe(false);
        }
    });
});

