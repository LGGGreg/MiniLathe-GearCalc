import { describe, it, expect, beforeEach } from 'vitest';
import { GearOptimizer } from './gearOptimizer';
import { PitchSetup } from './pitchSetup';
import { Gear, Gears, GearModule } from './gear';
import { Pitch, PitchType } from './pitch';
import CombinationFinder from './combinationFinder';
import LatheConfig from './latheConfig';

describe('GearOptimizer', () => {
    let module: GearModule;
    
    beforeEach(() => {
        module = GearModule.fromString("M1")!;
    });

    describe('selectBest', () => {
        it('should return null for empty candidates', () => {
            const result = GearOptimizer.selectBest([], 1.25, []);
            expect(result).toBeNull();
        });

        it('should return the only candidate when there is one', () => {
            const setup = new PitchSetup(
                new Gear(module, 20),
                undefined,
                undefined,
                new Gear(module, 80),
                new Pitch(1.25, PitchType.Metric)
            );
            const result = GearOptimizer.selectBest([setup], 1.25, []);
            expect(result).toBe(setup);
        });

        it('should prefer more accurate pitch when accuracy differs significantly', () => {
            const accurate = new PitchSetup(
                new Gear(module, 20),
                undefined,
                undefined,
                new Gear(module, 80),
                new Pitch(1.2500, PitchType.Metric)
            );
            const lessAccurate = new PitchSetup(
                new Gear(module, 21),
                undefined,
                undefined,
                new Gear(module, 65),
                new Pitch(1.2476, PitchType.Metric)
            );
            
            const result = GearOptimizer.selectBest([accurate, lessAccurate], 1.25, []);
            expect(result).toBe(accurate);
        });

        it('should prefer B=C setup over 4-gear when accuracy is similar', () => {
            const bcSetup = new PitchSetup(
                new Gear(module, 20),
                new Gear(module, 45),
                new Gear(module, 45),
                new Gear(module, 80),
                new Pitch(1.2500, PitchType.Metric)
            );
            const fourGear = new PitchSetup(
                new Gear(module, 20),
                new Gear(module, 40),
                new Gear(module, 50),
                new Gear(module, 80),
                new Pitch(1.2500, PitchType.Metric)
            );

            const result = GearOptimizer.selectBest([fourGear, bcSetup], 1.25, []);
            expect(result).toBe(bcSetup);
        });

        it('should prefer gear reuse when accuracy is similar', () => {
            const favorites = [
                new PitchSetup(
                    new Gear(module, 20),
                    new Gear(module, 40),
                    new Gear(module, 40),
                    new Gear(module, 80),
                    new Pitch(1.0, PitchType.Metric)
                )
            ];

            const reuseGears = new PitchSetup(
                new Gear(module, 20),
                new Gear(module, 40),
                new Gear(module, 40),
                new Gear(module, 80),
                new Pitch(1.2500, PitchType.Metric)
            );
            const newGears = new PitchSetup(
                new Gear(module, 21),
                new Gear(module, 45),
                new Gear(module, 45),
                new Gear(module, 65),
                new Pitch(1.2500, PitchType.Metric)
            );
            
            const result = GearOptimizer.selectBest([newGears, reuseGears], 1.25, favorites);
            expect(result).toBe(reuseGears);
        });

        it('should prefer position consistency when other factors are equal', () => {
            const favorites = [
                new PitchSetup(
                    new Gear(module, 20),
                    new Gear(module, 40),
                    new Gear(module, 40),
                    new Gear(module, 80),
                    new Pitch(1.0, PitchType.Metric)
                ),
                new PitchSetup(
                    new Gear(module, 20),
                    new Gear(module, 40),
                    new Gear(module, 40),
                    new Gear(module, 80),
                    new Pitch(1.25, PitchType.Metric)
                )
            ];

            // Setup with 4 matching positions (A, B, C, D) - all gears in same positions
            const moreConsistent = new PitchSetup(
                new Gear(module, 20), // Same as favorite position A ✓
                new Gear(module, 40), // Same as favorite position B ✓
                new Gear(module, 40), // Same as favorite position C ✓
                new Gear(module, 80), // Same as favorite position D ✓
                new Pitch(1.5000, PitchType.Metric)
            );
            // Setup with 3 matching gears but different positions
            const lessConsistent = new PitchSetup(
                new Gear(module, 21), // Different gear
                new Gear(module, 40), // Same as favorite position B ✓
                new Gear(module, 40), // Same as favorite position C ✓
                new Gear(module, 80), // Same as favorite position D ✓
                new Pitch(1.5000, PitchType.Metric)
            );

            // moreConsistent has 4 gears matching positions vs 3, and 4 gears reused vs 3
            const result = GearOptimizer.selectBest([lessConsistent, moreConsistent], 1.5, favorites);
            expect(result).toBe(moreConsistent);
        });
    });

    describe('analyzeGearUsage', () => {
        it('should return empty map for no favorites', () => {
            const usage = GearOptimizer.analyzeGearUsage([]);
            expect(usage.size).toBe(0);
        });

        it('should count gear usage correctly', () => {
            const favorites = [
                new PitchSetup(
                    new Gear(module, 20),
                    new Gear(module, 40),
                    new Gear(module, 40),
                    new Gear(module, 80),
                    new Pitch(1.0, PitchType.Metric)
                ),
                new PitchSetup(
                    new Gear(module, 20),
                    new Gear(module, 45),
                    new Gear(module, 45),
                    new Gear(module, 80),
                    new Pitch(1.25, PitchType.Metric)
                ),
                new PitchSetup(
                    new Gear(module, 20),
                    undefined,
                    undefined,
                    new Gear(module, 80),
                    new Pitch(1.6, PitchType.Metric)
                )
            ];

            const usage = GearOptimizer.analyzeGearUsage(favorites);

            expect(usage.get("M1 Z20")).toBe(3); // Used in all 3
            expect(usage.get("M1 Z80")).toBe(3); // Used in all 3
            expect(usage.get("M1 Z40")).toBe(2); // Used in first setup (B and C)
            expect(usage.get("M1 Z45")).toBe(2); // Used in second setup (B and C)
        });
    });

    describe('getGearStatistics', () => {
        it('should return correct statistics', () => {
            const favorites = [
                new PitchSetup(
                    new Gear(module, 20),
                    new Gear(module, 40),
                    new Gear(module, 40),
                    new Gear(module, 80),
                    new Pitch(1.0, PitchType.Metric)
                ),
                new PitchSetup(
                    new Gear(module, 20),
                    new Gear(module, 45),
                    new Gear(module, 45),
                    new Gear(module, 80),
                    new Pitch(1.25, PitchType.Metric)
                ),
                new PitchSetup(
                    new Gear(module, 20),
                    undefined,
                    undefined,
                    new Gear(module, 80),
                    new Pitch(1.6, PitchType.Metric)
                )
            ];

            const stats = GearOptimizer.getGearStatistics(favorites);
            
            expect(stats.totalSetups).toBe(3);
            expect(stats.twoGearSetups).toBe(1);
            expect(stats.fourGearSetups).toBe(2);
            expect(stats.mostUsedGears.length).toBeGreaterThan(0);
            expect(stats.mostUsedGears[0].gear).toBe("M1 Z20"); // Most used
            expect(stats.mostUsedGears[0].count).toBe(3);
        });

        it('should track gears by position correctly', () => {
            const favorites = [
                new PitchSetup(
                    new Gear(module, 20),
                    new Gear(module, 40),
                    new Gear(module, 40),
                    new Gear(module, 80),
                    new Pitch(1.0, PitchType.Metric)
                ),
                new PitchSetup(
                    new Gear(module, 20),
                    new Gear(module, 45),
                    new Gear(module, 45),
                    new Gear(module, 80),
                    new Pitch(1.25, PitchType.Metric)
                )
            ];

            const stats = GearOptimizer.getGearStatistics(favorites);

            expect(stats.gearsByPosition.A.get("M1 Z20")).toBe(2);
            expect(stats.gearsByPosition.B.get("M1 Z40")).toBe(1);
            expect(stats.gearsByPosition.B.get("M1 Z45")).toBe(1);
            expect(stats.gearsByPosition.C.get("M1 Z40")).toBe(1);
            expect(stats.gearsByPosition.C.get("M1 Z45")).toBe(1);
            expect(stats.gearsByPosition.D.get("M1 Z80")).toBe(2);
        });
    });

    describe('Real-world scenarios', () => {
        it('should optimize for M6, M8, M10 workflow', () => {
            // Simulate a user who has M6 and M8 in favorites
            const favorites = [
                new PitchSetup(
                    new Gear(module, 20),
                    new Gear(module, 40),
                    new Gear(module, 40),
                    new Gear(module, 80),
                    new Pitch(1.0, PitchType.Metric) // M6
                ),
                new PitchSetup(
                    new Gear(module, 20),
                    new Gear(module, 40),
                    new Gear(module, 40),
                    new Gear(module, 80),
                    new Pitch(1.25, PitchType.Metric) // M8
                )
            ];

            // Now finding best setup for M10 (1.5 mm/rev)
            const candidates = [
                new PitchSetup(
                    new Gear(module, 20),
                    new Gear(module, 40),
                    new Gear(module, 40),
                    new Gear(module, 80),
                    new Pitch(1.5, PitchType.Metric) // Uses same gears!
                ),
                new PitchSetup(
                    new Gear(module, 21),
                    new Gear(module, 45),
                    new Gear(module, 45),
                    new Gear(module, 65),
                    new Pitch(1.5, PitchType.Metric) // Different gears
                )
            ];

            const result = GearOptimizer.selectBest(candidates, 1.5, favorites);
            
            // Should choose the setup that reuses gears from favorites
            expect(result?.gearA?.teeth).toBe(20);
            expect(result?.gearB?.teeth).toBe(40);
            expect(result?.gearC?.teeth).toBe(40);
            expect(result?.gearD?.teeth).toBe(80);
        });

        it('should calculate UNC #0 (80 TPI) correctly with 16 TPI leadscrew', () => {
            // Setup: Default config with 16 TPI leadscrew
            const config = new LatheConfig();
            config.leadscrew = new Pitch(16, PitchType.Imperial);

            // Generate all combinations (synchronous, skip worker)
            const finder = new CombinationFinder(undefined, true);
            const combos = finder.findAllCombinations(config);

            console.log(`Generated ${combos.length} combinations`);

            // Check overall 2-gear vs 4-gear distribution
            const allTwoGear = combos.filter(c => c.gearB === undefined && c.gearC === undefined);
            const allFourGear = combos.filter(c => c.gearB !== undefined || c.gearC !== undefined);
            console.log(`Overall: ${allTwoGear.length} two-gear, ${allFourGear.length} four-gear`);

            // Show some example 2-gear setups
            if (allTwoGear.length > 0) {
                console.log(`Example 2-gear setups:`);
                allTwoGear.slice(0, 5).forEach(s => {
                    console.log(`  ${s.gearA?.teeth}, -, -, ${s.gearD?.teeth} → ${s.pitch.convert().value.toFixed(3)} TPI`);
                });
            }

            // Find candidates for UNC #0 (80 TPI)
            const targetPitch = new Pitch(80, PitchType.Imperial);
            const targetMetric = targetPitch.convert();
            const thr = 1.003;

            const candidates = combos.filter(s =>
                s.pitch.value > targetMetric.value / thr &&
                s.pitch.value < targetMetric.value * thr
            );

            console.log(`Found ${candidates.length} candidates for UNC #0 (80 TPI)`);

            // Check how many are 2-gear vs 4-gear
            const twoGearCandidates = candidates.filter(c => c.gearB === undefined && c.gearC === undefined);
            const fourGearCandidates = candidates.filter(c => c.gearB !== undefined || c.gearC !== undefined);
            console.log(`  - 2-gear setups: ${twoGearCandidates.length}`);
            console.log(`  - 4-gear setups: ${fourGearCandidates.length}`);

            if (twoGearCandidates.length > 0) {
                console.log(`  - Best 2-gear: ${twoGearCandidates[0].gearA?.teeth}, -, -, ${twoGearCandidates[0].gearD?.teeth} → ${twoGearCandidates[0].pitch.convert().value.toFixed(3)} TPI`);
            }

            // Find the best one
            const best = GearOptimizer.selectBest(candidates, targetMetric.value, []);

            expect(best).not.toBeNull();

            if (best) {
                console.log(`Best setup: ${best.gearA?.teeth}, ${best.gearB?.teeth}, ${best.gearC?.teeth}, ${best.gearD?.teeth}`);
                console.log(`Pitch: ${best.pitch.value} mm (${best.pitch.convert().value} TPI)`);
                console.log(`Error: ${Math.abs(best.pitch.convert().value - 80)} TPI`);

                // Should be very close to 80 TPI
                const actualTPI = best.pitch.convert().value;
                expect(Math.abs(actualTPI - 80)).toBeLessThan(0.1);
            }
        });

        it('should use batch optimization for multiple imperial threads', () => {
            // Setup: Default config with 16 TPI leadscrew
            const config = new LatheConfig();
            config.leadscrew = new Pitch(16, PitchType.Imperial);

            // Generate all combinations (synchronous, skip worker)
            const finder = new CombinationFinder(undefined, true);
            const combos = finder.findAllCombinations(config);

            const thr = 1.003;

            // Collect candidates for multiple threads
            const threads = [
                { name: "UNC #0", tpi: 80 },
                { name: "UNC #1", tpi: 64 },
                { name: "UNC #2", tpi: 56 }
            ];

            const batchInput = threads.map(t => {
                const targetPitch = new Pitch(t.tpi, PitchType.Imperial);
                const targetMetric = targetPitch.convert();
                const candidates = combos.filter(s =>
                    s.pitch.value > targetMetric.value / thr &&
                    s.pitch.value < targetMetric.value * thr
                );
                return {
                    targetPitch: targetMetric.value,
                    name: t.name,
                    candidates
                };
            });

            // Batch optimize
            const results = GearOptimizer.selectBestBatch(batchInput);

            console.log('\nBatch optimization results:');
            results.forEach(({setup, name}) => {
                const actualTPI = setup.pitch.convert().value;
                console.log(`${name}: ${setup.gearA?.teeth}, ${setup.gearB?.teeth}, ${setup.gearC?.teeth}, ${setup.gearD?.teeth} → ${actualTPI.toFixed(3)} TPI`);
            });

            expect(results.length).toBe(3);

            // All should be very accurate
            results.forEach(({setup, name}) => {
                const thread = threads.find(t => t.name === name);
                const actualTPI = setup.pitch.convert().value;
                const error = Math.abs(actualTPI - thread!.tpi);
                console.log(`${name} error: ${error.toFixed(3)} TPI`);
                expect(error).toBeLessThan(0.1);
            });
        });

        it('should be order-independent (same result regardless of input order)', () => {
            const config = new LatheConfig();
            config.leadscrew = new Pitch(16, PitchType.Imperial);
            const finder = new CombinationFinder(undefined, true);
            const combos = finder.findAllCombinations(config);
            const thr = 1.003;

            // Define threads in different orders
            const threads = [
                { name: "UNC #0", tpi: 80 },
                { name: "UNC #1", tpi: 64 },
                { name: "UNC #2", tpi: 56 }
            ];

            const createBatchInput = (order: number[]) => {
                return order.map(idx => {
                    const t = threads[idx];
                    const targetPitch = new Pitch(t.tpi, PitchType.Imperial);
                    const targetMetric = targetPitch.convert();
                    const candidates = combos.filter(s =>
                        s.pitch.value > targetMetric.value / thr &&
                        s.pitch.value < targetMetric.value * thr
                    );
                    return { targetPitch: targetMetric.value, name: t.name, candidates };
                });
            };

            // Test with 3 different orders
            const result1 = GearOptimizer.selectBestBatch(createBatchInput([0, 1, 2]));
            const result2 = GearOptimizer.selectBestBatch(createBatchInput([2, 0, 1]));
            const result3 = GearOptimizer.selectBestBatch(createBatchInput([1, 2, 0]));

            // Extract setups by name
            const getSetup = (results: any[], name: string) => results.find(r => r.name === name)?.setup;

            const unc0_1 = getSetup(result1, 'UNC #0');
            const unc0_2 = getSetup(result2, 'UNC #0');
            const unc0_3 = getSetup(result3, 'UNC #0');

            console.log('\nOrder-independence test:');
            console.log(`Order [0,1,2]: UNC #0 = ${unc0_1?.gearA?.teeth}, ${unc0_1?.gearB?.teeth}, ${unc0_1?.gearC?.teeth}, ${unc0_1?.gearD?.teeth}`);
            console.log(`Order [2,0,1]: UNC #0 = ${unc0_2?.gearA?.teeth}, ${unc0_2?.gearB?.teeth}, ${unc0_2?.gearC?.teeth}, ${unc0_2?.gearD?.teeth}`);
            console.log(`Order [1,2,0]: UNC #0 = ${unc0_3?.gearA?.teeth}, ${unc0_3?.gearB?.teeth}, ${unc0_3?.gearC?.teeth}, ${unc0_3?.gearD?.teeth}`);

            // All three orders should produce the same result for UNC #0
            expect(unc0_1?.gearA?.teeth).toBe(unc0_2?.gearA?.teeth);
            expect(unc0_1?.gearA?.teeth).toBe(unc0_3?.gearA?.teeth);
            expect(unc0_1?.gearB?.teeth).toBe(unc0_2?.gearB?.teeth);
            expect(unc0_1?.gearB?.teeth).toBe(unc0_3?.gearB?.teeth);
        });

        it('should find simplified 2-gear setups from CSV', () => {
            // Test some of the "ANY" setups from the CSV
            const config = new LatheConfig();
            config.leadscrew = new Pitch(16, PitchType.Imperial);

            const finder = new CombinationFinder(undefined, true);
            const combos = finder.findAllCombinations(config);

            // Check for simplified 2-gear setups (B = C)
            const simplified2Gear = combos.filter(c =>
                c.gearB && c.gearC && Gears.equal(c.gearB, c.gearC)
            );

            console.log(`\nSimplified 2-gear setups (B=C): ${simplified2Gear.length}`);

            // Show some examples
            if (simplified2Gear.length > 0) {
                console.log(`Examples:`);
                simplified2Gear.slice(0, 10).forEach(s => {
                    console.log(`  ${s.gearA?.teeth}, ${s.gearB?.teeth}, ${s.gearC?.teeth}, ${s.gearD?.teeth} → ${s.pitch.convert().value.toFixed(3)} TPI`);
                });
            }

            // Check specific CSV examples
            // "8 TPI" should be: 40, ANY, -, 20
            // This means A=40, D=20, with B as spacer (B=C)
            const eightTPI = combos.filter(c => {
                const tpi = c.pitch.convert().value;
                return Math.abs(tpi - 8) < 0.01 &&
                       c.gearA?.teeth === 40 &&
                       c.gearD?.teeth === 20 &&
                       c.gearB && c.gearC && Gears.equal(c.gearB, c.gearC);
            });

            console.log(`\n8 TPI candidates (40, B=C, 20): ${eightTPI.length}`);
            if (eightTPI.length > 0) {
                eightTPI.forEach(s => {
                    console.log(`  40, ${s.gearB?.teeth}, ${s.gearC?.teeth}, 20 → ${s.pitch.convert().value.toFixed(3)} TPI`);
                });
            }

            // "64 TPI" should be: 20, ANY, -, 80
            const sixtyFourTPI = combos.filter(c => {
                const tpi = c.pitch.convert().value;
                return Math.abs(tpi - 64) < 0.01 &&
                       c.gearA?.teeth === 20 &&
                       c.gearD?.teeth === 80 &&
                       c.gearB && c.gearC && Gears.equal(c.gearB, c.gearC);
            });

            console.log(`\n64 TPI candidates (20, B=C, 80): ${sixtyFourTPI.length}`);
            if (sixtyFourTPI.length > 0) {
                sixtyFourTPI.forEach(s => {
                    console.log(`  20, ${s.gearB?.teeth}, ${s.gearC?.teeth}, 80 → ${s.pitch.convert().value.toFixed(3)} TPI`);
                });
            }

            expect(simplified2Gear.length).toBeGreaterThan(0);
        });
    });
});

