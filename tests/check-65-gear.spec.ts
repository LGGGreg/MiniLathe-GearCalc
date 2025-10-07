import { test, expect } from '@playwright/test';

test.describe('Check if 65T gear exists and 40,65,65,30 is generated', () => {
    test('should check gear collection and combinations', async ({ page }) => {
        await page.goto('http://localhost:5174/');
        await page.waitForLoadState('networkidle');

        // Wait a bit for app to initialize
        await page.waitForTimeout(1000);

        // Execute JavaScript in the browser context
        const result = await page.evaluate(() => {
            // @ts-ignore
            const GlobalConfig = window.GlobalConfig;
            
            if (!GlobalConfig) {
                return { error: 'GlobalConfig not found' };
            }

            // Check gear collection
            const gears = GlobalConfig.config?.gears || [];
            const gearTeeth = gears.map((g: any) => g.teeth).sort((a: number, b: number) => a - b);
            const has65 = gears.some((g: any) => g.teeth === 65);
            
            // Count gears
            const gearCounts: Record<number, number> = {};
            gears.forEach((g: any) => {
                gearCounts[g.teeth] = (gearCounts[g.teeth] || 0) + 1;
            });

            // Check combos
            const combos = GlobalConfig.combos || [];
            const totalCombos = combos.length;
            
            // Look for 40, 65, 65, 30
            const target = combos.find((c: any) => 
                c.gearA?.teeth === 40 &&
                c.gearB?.teeth === 65 &&
                c.gearC?.teeth === 65 &&
                c.gearD?.teeth === 30
            );

            // Look for all combinations with B=65, C=65
            const with65 = combos.filter((c: any) => 
                c.gearB?.teeth === 65 && c.gearC?.teeth === 65
            );

            // Look for combinations with A=40, D=30
            const with40_30 = combos.filter((c: any) => 
                c.gearA?.teeth === 40 && c.gearD?.teeth === 30
            );

            // Look for combinations near 12 TPI
            const near12 = combos.filter((c: any) => {
                const pitch = c.pitch;
                let tpi;
                if (pitch.type === 1) { // Imperial
                    tpi = pitch.value;
                } else { // Metric
                    tpi = 25.4 / pitch.value;
                }
                return Math.abs(tpi - 12.0) < 0.01;
            });

            return {
                gearTeeth,
                has65,
                gearCounts,
                totalCombos,
                targetFound: !!target,
                targetDetails: target ? {
                    gearA: target.gearA?.teeth,
                    gearB: target.gearB?.teeth,
                    gearC: target.gearC?.teeth,
                    gearD: target.gearD?.teeth,
                    pitch: target.pitch?.value,
                    pitchType: target.pitch?.type
                } : null,
                with65Count: with65.length,
                with65Examples: with65.slice(0, 5).map((c: any) => ({
                    A: c.gearA?.teeth,
                    B: c.gearB?.teeth,
                    C: c.gearC?.teeth,
                    D: c.gearD?.teeth
                })),
                with40_30Count: with40_30.length,
                with40_30Examples: with40_30.slice(0, 10).map((c: any) => ({
                    A: c.gearA?.teeth,
                    B: c.gearB?.teeth,
                    C: c.gearC?.teeth,
                    D: c.gearD?.teeth
                })),
                near12Count: near12.length,
                near12Examples: near12.slice(0, 10).map((c: any) => ({
                    A: c.gearA?.teeth,
                    B: c.gearB?.teeth,
                    C: c.gearC?.teeth,
                    D: c.gearD?.teeth,
                    tpi: c.pitch?.type === 1 ? c.pitch.value : 25.4 / c.pitch.value
                }))
            };
        });

        console.log('=== Gear Collection ===');
        console.log('Gear teeth:', result.gearTeeth);
        console.log('Has 65T gear:', result.has65);
        console.log('Gear counts:', result.gearCounts);
        console.log('');

        console.log('=== Combinations ===');
        console.log('Total combinations:', result.totalCombos);
        console.log('');

        console.log('=== Target: 40, 65, 65, 30 ===');
        console.log('Found:', result.targetFound);
        if (result.targetDetails) {
            console.log('Details:', result.targetDetails);
        }
        console.log('');

        console.log('=== Combinations with B=65, C=65 ===');
        console.log('Count:', result.with65Count);
        console.log('Examples:', result.with65Examples);
        console.log('');

        console.log('=== Combinations with A=40, D=30 ===');
        console.log('Count:', result.with40_30Count);
        console.log('Examples:', result.with40_30Examples);
        console.log('');

        console.log('=== Combinations near 12 TPI ===');
        console.log('Count:', result.near12Count);
        console.log('Examples:', result.near12Examples);
        console.log('');

        // Assertions
        expect(result.has65).toBe(true);
        expect(result.totalCombos).toBeGreaterThan(0);
        
        // This is the key assertion - should be true!
        if (!result.targetFound) {
            console.log('❌ FAIL: 40, 65, 65, 30 NOT FOUND!');
            console.log('This combination should exist but is missing from the generated combinations.');
        } else {
            console.log('✅ PASS: 40, 65, 65, 30 found!');
        }
        
        expect(result.targetFound).toBe(true);
    });
});

