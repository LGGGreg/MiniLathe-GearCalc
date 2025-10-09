import { describe, it, expect } from 'vitest';
import { GearOptimizer } from '../src/bll/gearOptimizer';
import { PitchSetup } from '../src/bll/pitchSetup';
import { Gear, GearModule, Gears } from '../src/bll/gear';
import { Pitch, PitchType } from '../src/bll/pitch';
import CombinationFinder from '../src/bll/combinationFinder';
import LatheConfig from '../src/bll/latheConfig';

describe('11 TPI Gear Selection (UNC 5/8)', () => {
    it('should select best gear combination for 11 TPI with default config', () => {
        // Setup: Use static defaults from LatheConfig (don't load from storage)
        const m1 = GearModule.fromString("M1")!;
        const config = new LatheConfig();
        config.leadscrew = new Pitch(16, PitchType.Imperial);
        config.minTeeth = 82;
        config.maxSize = 90;
        config.minAxleDistanceCD = 44;
        config.minAxleDistanceAB = 34;
        config.gears = Gears.listFromTeeth([20,20,20,21,25,30,35,40,40,45,45,48,50,50,54,55,57,60,60,65,72,80,80], m1);

        // Generate all combinations (synchronous, skip worker)
        const finder = new CombinationFinder(undefined, true);
        const combos = finder.findAllCombinations(config);

        console.log(`Total combinations: ${combos.length}`);

        // Find candidates for 11 TPI (UNC 5/8)
        const targetPitch = new Pitch(11, PitchType.Imperial);
        const targetMetric = targetPitch.convert(); // Convert to mm/rev
        const thr = 1.003;

        const candidates = combos.filter(s =>
            s.pitch.value > targetMetric.value / thr &&
            s.pitch.value < targetMetric.value * thr
        );

        console.log(`\nFound ${candidates.length} candidates for 11 TPI`);
        console.log(`Target: 11 TPI = ${targetMetric.value.toFixed(6)} mm/rev`);

        // List all candidates to see what options exist
        console.log(`\nAll candidates for 11 TPI:`);
        candidates.forEach((c, idx) => {
            const maxTeeth = Math.max(c.gearA?.teeth || 0, c.gearB?.teeth || 0, c.gearC?.teeth || 0, c.gearD?.teeth || 0);
            const largestInD = c.gearD?.teeth === maxTeeth;
            const isSimplified = c.gearB?.teeth === c.gearC?.teeth;
            console.log(`  ${idx + 1}. ${c.gearA?.teeth}-${c.gearB?.teeth}-${c.gearC?.teeth}-${c.gearD?.teeth} ` +
                `(${c.pitch.convert().value.toFixed(6)} TPI) ` +
                `${isSimplified ? '[B=C]' : ''} ` +
                `${largestInD ? '[LARGEST IN D]' : ''}`);
        });

        // Verify that 55-50-50-80 is NOT a valid candidate (wrong pitch)
        const invalidCombo = candidates.find(c =>
            c.gearA?.teeth === 55 &&
            c.gearB?.teeth === 50 &&
            c.gearC?.teeth === 50 &&
            c.gearD?.teeth === 80
        );

        console.log(`\n55-50-50-80 found in candidates: ${invalidCombo ? 'YES (ERROR!)' : 'NO (correct)'}`);

        // Manually verify why 55-50-50-80 gives wrong pitch
        const testSetup = PitchSetup.fromGearsAndLeadscrew(
            new Gear(m1, 55),
            new Gear(m1, 50),
            new Gear(m1, 50),
            new Gear(m1, 80),
            config.leadscrew
        );

        const ratio = (55 * 50) / (50 * 80);
        const expectedTPI = 16 / ratio;
        console.log(`\n55-50-50-80 pitch calculation:`);
        console.log(`  Ratio: (55 × 50) / (50 × 80) = ${ratio.toFixed(6)}`);
        console.log(`  TPI: 16 / ${ratio.toFixed(6)} = ${expectedTPI.toFixed(6)} TPI`);
        console.log(`  This is NOT 11 TPI, so it's correctly excluded!`);

        expect(invalidCombo).toBeUndefined(); // Should NOT be in candidates

        // Verify that 80-50-50-55 IS a valid candidate (correct pitch)
        const validCombo = candidates.find(c =>
            c.gearA?.teeth === 80 &&
            c.gearB?.teeth === 50 &&
            c.gearC?.teeth === 50 &&
            c.gearD?.teeth === 55
        );

        console.log(`\n80-50-50-55 found in candidates: ${validCombo ? 'YES (correct)' : 'NO (ERROR!)'}`);
        if (validCombo) {
            console.log(`  Pitch: ${validCombo.pitch.convert().value.toFixed(6)} TPI`);
            console.log(`  Error: ${Math.abs(validCombo.pitch.convert().value - 11).toFixed(6)} TPI`);
        }

        expect(validCombo).toBeDefined(); // Should be in candidates

        // Check what the optimizer chooses
        const result = GearOptimizer.selectBest(candidates, targetMetric.value, []);

        console.log(`\n=== Optimizer Selection ===`);
        console.log(`Optimizer chose: ${result?.gearA?.teeth}-${result?.gearB?.teeth}-${result?.gearC?.teeth}-${result?.gearD?.teeth}`);
        console.log(`  Pitch: ${result?.pitch.convert().value.toFixed(6)} TPI`);
        console.log(`  Error: ${Math.abs(result!.pitch.convert().value - 11).toFixed(6)} TPI`);

        const isSimplified = result?.gearB?.teeth === result?.gearC?.teeth;
        console.log(`  Is B=C simplified: ${isSimplified}`);

        // Check if there are any candidates with 80 in position D
        const candidatesWithLargestInD = candidates.filter(c => c.gearD?.teeth === 80);
        console.log(`\nCandidates with 80T in position D: ${candidatesWithLargestInD.length}`);

        if (candidatesWithLargestInD.length === 0) {
            console.log(`  → No valid combinations exist with 80T in position D for 11 TPI`);
            console.log(`  → This is mathematically correct - the ratio doesn't allow it`);

            // Find what's the largest gear that CAN be in position D
            const maxDTeeth = Math.max(...candidates.map(c => c.gearD?.teeth || 0));
            console.log(`  → Largest gear possible in position D: ${maxDTeeth}T`);

            const candidatesWithMaxD = candidates.filter(c => c.gearD?.teeth === maxDTeeth);
            console.log(`  → Candidates with ${maxDTeeth}T in position D: ${candidatesWithMaxD.length}`);
            candidatesWithMaxD.slice(0, 5).forEach(c => {
                console.log(`     - ${c.gearA?.teeth}-${c.gearB?.teeth}-${c.gearC?.teeth}-${c.gearD?.teeth}`);
            });
        }

        // Verify the optimizer chose a valid, accurate solution
        expect(result).toBeDefined();
        expect(result?.pitch.convert().value).toBeCloseTo(11.0, 5); // Within 0.00001 TPI
        expect(result?.gearA?.teeth).toBe(80); // Should have 80 in position A
        expect(result?.gearB?.teeth).toBe(result?.gearC?.teeth); // Should be B=C simplified
        expect(result?.gearD?.teeth).toBe(55); // Should have 55 in position D

        console.log(`\n✓ Test passed: Optimizer correctly selected a B=C simplified setup with perfect accuracy`);
        console.log(`✓ The "largest gear in D" preference cannot apply here because 80T in D is mathematically impossible for 11 TPI`);
    });
});

