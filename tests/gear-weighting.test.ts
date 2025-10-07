import { describe, it, expect } from 'vitest';
import { GearOptimizer } from '../src/bll/gearOptimizer';
import { PitchSetup } from '../src/bll/pitchSetup';
import { Gear, GearModule, ModuleType } from '../src/bll/gear';
import { Pitch, PitchType } from '../src/bll/pitch';

describe('Gear Weighting Bonuses', () => {
    const module = new GearModule(1, ModuleType.Metric);

    it('should prefer setup with largest gear in position D', () => {
        // Two setups with same pitch accuracy
        // Setup 1: Largest gear (80T) in position D
        const setup1 = new PitchSetup(
            new Gear(module, 40),
            new Gear(module, 50),
            new Gear(module, 50),
            new Gear(module, 80), // Largest gear in D
            new Pitch(2.0, PitchType.Metric)
        );

        // Setup 2: Largest gear (80T) in position B/C
        const setup2 = new PitchSetup(
            new Gear(module, 40),
            new Gear(module, 80), // Largest gear in B
            new Gear(module, 80), // Largest gear in C
            new Gear(module, 50),
            new Pitch(2.0, PitchType.Metric)
        );

        const candidates = [setup1, setup2];
        const result = GearOptimizer.selectBest(candidates, 2.0, []);

        // Should prefer setup1 (largest gear in D)
        expect(result?.gearD?.teeth).toBe(80);
        expect(result?.gearA?.teeth).toBe(40);
        expect(result?.gearB?.teeth).toBe(50);
    });

    it('should prefer setup with gear D >= 50 teeth', () => {
        // Two setups with same pitch accuracy
        // Setup 1: Gear D has 65 teeth (>= 50)
        const setup1 = new PitchSetup(
            new Gear(module, 40),
            new Gear(module, 48),
            new Gear(module, 48),
            new Gear(module, 65), // >= 50 teeth
            new Pitch(1.625, PitchType.Metric)
        );

        // Setup 2: Gear D has 30 teeth (< 50)
        const setup2 = new PitchSetup(
            new Gear(module, 40),
            new Gear(module, 80),
            new Gear(module, 80),
            new Gear(module, 30), // < 50 teeth
            new Pitch(1.625, PitchType.Metric)
        );

        const candidates = [setup1, setup2];
        const result = GearOptimizer.selectBest(candidates, 1.625, []);

        // Should prefer setup1 (D >= 50 teeth)
        expect(result?.gearD?.teeth).toBe(65);
    });

    it('should combine both bonuses when applicable', () => {
        // Setup 1: Largest gear (80T) in D AND D >= 50 (gets both bonuses)
        const setup1 = new PitchSetup(
            new Gear(module, 20),
            new Gear(module, 40),
            new Gear(module, 40),
            new Gear(module, 80), // Largest AND >= 50
            new Pitch(1.6, PitchType.Metric)
        );

        // Setup 2: Largest gear (80T) in B/C, D < 50 (gets neither bonus)
        const setup2 = new PitchSetup(
            new Gear(module, 20),
            new Gear(module, 80),
            new Gear(module, 80),
            new Gear(module, 40), // Not largest, < 50
            new Pitch(1.6, PitchType.Metric)
        );

        const candidates = [setup1, setup2];
        const result = GearOptimizer.selectBest(candidates, 1.6, []);

        // Should strongly prefer setup1 (gets both bonuses: 1000 + 500 = 1500 points)
        expect(result?.gearD?.teeth).toBe(80);
        expect(result?.gearA?.teeth).toBe(20);
    });

    it('should not override pitch accuracy or simplicity preferences', () => {
        // Setup 1: Better pitch accuracy, but smaller gear in D
        const setup1 = new PitchSetup(
            new Gear(module, 40),
            new Gear(module, 50),
            new Gear(module, 50),
            new Gear(module, 30), // Small gear in D
            new Pitch(2.0000, PitchType.Metric) // Exact match
        );

        // Setup 2: Worse pitch accuracy, but largest gear in D
        const setup2 = new PitchSetup(
            new Gear(module, 40),
            new Gear(module, 48),
            new Gear(module, 48),
            new Gear(module, 80), // Large gear in D
            new Pitch(2.1000, PitchType.Metric) // Off by 0.1
        );

        const candidates = [setup1, setup2];
        const result = GearOptimizer.selectBest(candidates, 2.0, []);

        // Should prefer setup1 (better accuracy trumps gear size bonus)
        expect(result?.gearD?.teeth).toBe(30);
        expect(result?.pitch.value).toBe(2.0);
    });

    it('should prefer B=C simplicity over gear size bonuses', () => {
        // Setup 1: B=C (simplified), but smaller gear in D
        const setup1 = new PitchSetup(
            new Gear(module, 40),
            new Gear(module, 50),
            new Gear(module, 50), // B=C
            new Gear(module, 40),
            new Pitch(2.0, PitchType.Metric)
        );

        // Setup 2: B≠C (complex), largest gear in D
        const setup2 = new PitchSetup(
            new Gear(module, 40),
            new Gear(module, 48),
            new Gear(module, 52), // B≠C
            new Gear(module, 80), // Largest gear in D
            new Pitch(2.0, PitchType.Metric)
        );

        const candidates = [setup1, setup2];
        const result = GearOptimizer.selectBest(candidates, 2.0, []);

        // Should prefer setup1 (B=C simplicity bonus is 120,000 vs 1,500 for gear bonuses)
        expect(result?.gearB?.teeth).toBe(50);
        expect(result?.gearC?.teeth).toBe(50);
    });

    it('should act as tie-breaker when accuracy and simplicity are equal', () => {
        // Both setups: same pitch, both B=C
        // Setup 1: Largest gear (65T) in D
        const setup1 = new PitchSetup(
            new Gear(module, 40),
            new Gear(module, 48),
            new Gear(module, 48),
            new Gear(module, 65), // Largest in D, >= 50
            new Pitch(1.625, PitchType.Metric)
        );

        // Setup 2: Largest gear (65T) in B/C
        const setup2 = new PitchSetup(
            new Gear(module, 40),
            new Gear(module, 65),
            new Gear(module, 65), // Largest in B/C
            new Gear(module, 48), // Not largest, < 50
            new Pitch(1.625, PitchType.Metric)
        );

        const candidates = [setup1, setup2];
        const result = GearOptimizer.selectBest(candidates, 1.625, []);

        // Should prefer setup1 (gear bonuses act as tie-breaker)
        expect(result?.gearD?.teeth).toBe(65);
        expect(result?.gearB?.teeth).toBe(48);
    });
});

