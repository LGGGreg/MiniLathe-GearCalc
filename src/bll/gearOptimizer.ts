import { PitchSetup } from './pitchSetup';
import { Gears, type Gear } from './gear';
import GlobalConfig from './globalConfig';

/**
 * GearOptimizer - Smart gear selection algorithm
 *
 * When multiple gear combinations produce similar pitch values,
 * this optimizer scores them based on:
 * 1. Pitch accuracy (primary)
 * 2. Gear reuse across favorites (minimize gear changes)
 * 3. Simplicity (prefer 2-gear setups over 4-gear setups)
 */
export class GearOptimizer {

    /**
     * Select the best gear combinations for multiple threads as a batch
     * Uses iterative improvement to avoid path dependency
     * @param threads - Array of thread definitions with candidates
     * @returns Array of optimized PitchSetup objects (caller should add names)
     */
    public static selectBestBatch(
        threads: Array<{
            targetPitch: number,
            name: string,
            candidates: PitchSetup[]
        }>
    ): Array<{setup: PitchSetup, name: string}> {
        if (threads.length === 0) return [];

        // Phase 1: Generate initial solution using greedy algorithm
        const initial = this.generateGreedySolution(threads);

        // Phase 2: Iterative improvement (hill climbing)
        // Try swapping each thread's setup with alternatives to improve total score
        let current = initial;
        let improved = true;
        let iterations = 0;
        const maxIterations = 10; // Prevent infinite loops

        while (improved && iterations < maxIterations) {
            improved = false;
            iterations++;

            const currentScore = this.calculateTotalScore(current, threads);

            // Try improving each thread's selection
            for (let i = 0; i < threads.length; i++) {
                const thread = threads[i];
                const currentSetup = current[i].setup;

                // Try each alternative candidate
                for (const candidate of thread.candidates) {
                    if (candidate === currentSetup) continue;

                    // Create new solution with this candidate
                    const newSolution = [...current];
                    newSolution[i] = {setup: candidate, name: thread.name};

                    // Calculate new total score
                    const newScore = this.calculateTotalScore(newSolution, threads);

                    // If better, accept it and continue improving
                    if (newScore > currentScore) {
                        current = newSolution;
                        improved = true;
                        console.log(`[GearOptimizer] Improved ${thread.name}: score ${currentScore.toFixed(0)} → ${newScore.toFixed(0)}`);
                        break; // Move to next thread
                    }
                }
            }
        }

        console.log(`[GearOptimizer] Batch optimization completed in ${iterations} iterations`);
        return current;
    }

    /**
     * Generate initial solution using greedy algorithm
     * This provides a good starting point for iterative improvement
     */
    private static generateGreedySolution(
        threads: Array<{
            targetPitch: number,
            name: string,
            candidates: PitchSetup[]
        }>
    ): Array<{setup: PitchSetup, name: string}> {
        const result: Array<{setup: PitchSetup, name: string}> = [];
        const selectedSetups: PitchSetup[] = [];

        // Sort threads by number of candidates (fewest first)
        // This helps ensure we pick the best option for constrained threads first
        const sortedThreads = [...threads].sort((a, b) =>
            a.candidates.length - b.candidates.length
        );

        // Select best setup for each thread, considering previously selected setups
        for (const thread of sortedThreads) {
            const bestSetup = this.selectBest(
                thread.candidates,
                thread.targetPitch,
                selectedSetups
            );

            if (bestSetup) {
                result.push({setup: bestSetup, name: thread.name});
                selectedSetups.push(bestSetup);
            }
        }

        return result;
    }

    /**
     * Calculate total score for entire solution
     * This considers gear reuse and position consistency across ALL setups
     */
    private static calculateTotalScore(
        solution: Array<{setup: PitchSetup, name: string}>,
        threads: Array<{targetPitch: number, name: string, candidates: PitchSetup[]}>
    ): number {
        let total = 0;
        const allSetups = solution.map(s => s.setup);

        for (let i = 0; i < solution.length; i++) {
            const setup = solution[i].setup;
            const thread = threads.find(t => t.name === solution[i].name);
            if (!thread) continue;

            // Score this setup considering ALL other setups (not just previous ones)
            const otherSetups = allSetups.filter((_, idx) => idx !== i);
            total += this.calculateScore(setup, thread.targetPitch, otherSetups);
        }

        return total;
    }

    /**
     * Select the best gear combination from candidates
     * @param candidates - Array of possible gear setups
     * @param targetPitch - The desired pitch value
     * @param favorites - Current favorite setups (for gear reuse analysis)
     * @returns The best gear setup
     */
    public static selectBest(
        candidates: PitchSetup[],
        targetPitch: number,
        favorites: PitchSetup[] = []
    ): PitchSetup | null {
        if (candidates.length === 0) return null;
        if (candidates.length === 1) return candidates[0];

        // Calculate scores for all candidates
        const scored = candidates.map(candidate => ({
            setup: candidate,
            score: this.calculateScore(candidate, targetPitch, favorites)
        }));

        // Sort by score (higher is better)
        scored.sort((a, b) => b.score - a.score);

        // Debug logging
        if (scored.length > 1 && scored[0].score === scored[1].score) {
            console.log(`[GearOptimizer] Multiple candidates with same score for pitch ${targetPitch}`);
        }

        return scored[0].setup;
    }
    
    /**
     * Calculate a score for a gear setup
     * Higher score = better choice
     */
    private static calculateScore(
        setup: PitchSetup,
        targetPitch: number,
        favorites: PitchSetup[]
    ): number {
        let score = 0;
        
        // 1. Pitch accuracy (most important) - weight: 10000
        // Closer to target = higher score
        const pitchError = Math.abs(setup.pitch.value - targetPitch);
        const pitchAccuracyScore = 10000 / (1 + pitchError * 1000);
        score += (pitchAccuracyScore * 1000);
        
        // 2. Simplicity bonus
        // Prefer simplified 2-gear setups (B = C) over complex 4-gear setups
        // When B = C, B acts as spacer and C is not connected (D contacts B directly)
        // Note: True 2-gear (B and C undefined) is not physically possible on this lathe
        const isSimplified2Gear = setup.gearB && setup.gearC && Gears.equal(setup.gearB, setup.gearC);
        if (isSimplified2Gear) {
            score += 120000;  // B=C gets strong bonus (much simpler than 4 different gears)
        }
        
        // 3. Gear reuse score - weight: 50 per matching gear
        // Prefer setups that use gears already in favorites
        if (favorites.length > 0) {
            const reuseScore = this.calculateGearReuseScore(setup, favorites);
            score += reuseScore * 5;
        }
        
        // 4. Common gear position bonus - weight: 20 per position
        // Prefer setups where gears stay in the same position (A, B, C, or D)
        // B and C positions weighted 3x higher (harder to change)
        if (favorites.length > 0) {
            const positionScore = this.calculatePositionConsistencyScore(setup, favorites);
            score += positionScore * 20;
        }
        
        return score;
    }
    
    /**
     * Calculate how many gears from this setup are already used in favorites
     * Returns a value from 0 to 4
     */
    private static calculateGearReuseScore(
        setup: PitchSetup,
        favorites: PitchSetup[]
    ): number {
        const setupGears = this.getGearsFromSetup(setup);
        const favoriteGears = new Set<string>();
        
        // Collect all gears used in favorites
        favorites.forEach(fav => {
            this.getGearsFromSetup(fav).forEach(gear => {
                if (gear) favoriteGears.add(gear.toString());
            });
        });
        
        // Count how many setup gears are in favorites
        let reuseCount = 0;
        setupGears.forEach(gear => {
            if (gear && favoriteGears.has(gear.toString())) {
                reuseCount++;
            }
        });
        
        return reuseCount;
    }
    
    /**
     * Calculate how many gears are in the same position as in favorites
     * Rewards keeping gears in consistent positions (e.g., always using 20T in position A)
     * B and C positions are weighted 3x higher because they're harder to change
     */
    private static calculatePositionConsistencyScore(
        setup: PitchSetup,
        favorites: PitchSetup[]
    ): number {
        let consistencyScore = 0;

        // Count how many favorites have the same gear in the same position
        // B and C are weighted 3x because they're annoying to change
        favorites.forEach(fav => {
            if (setup.gearA && fav.gearA && Gears.equal(setup.gearA, fav.gearA)) {
                consistencyScore += 1;  // A is easy to change
            }
            if (setup.gearB && fav.gearB && Gears.equal(setup.gearB, fav.gearB)) {
                consistencyScore += 3;  // B is hard to change (3x weight)
            }
            if (setup.gearC && fav.gearC && Gears.equal(setup.gearC, fav.gearC)) {
                consistencyScore += 3;  // C is hard to change (3x weight)
            }
            if (setup.gearD && fav.gearD && Gears.equal(setup.gearD, fav.gearD)) {
                consistencyScore += 1;  // D is easy to change
            }
        });

        return consistencyScore;
    }
    
    /**
     * Extract all gears from a setup as an array
     */
    private static getGearsFromSetup(setup: PitchSetup): (Gear | undefined)[] {
        return [setup.gearA, setup.gearB, setup.gearC, setup.gearD];
    }
    
    /**
     * Analyze favorites to find most commonly used gears
     * Returns a map of gear -> usage count
     */
    public static analyzeGearUsage(favorites: PitchSetup[]): Map<string, number> {
        const usage = new Map<string, number>();
        
        favorites.forEach(setup => {
            this.getGearsFromSetup(setup).forEach(gear => {
                if (gear) {
                    const key = gear.toString();
                    usage.set(key, (usage.get(key) || 0) + 1);
                }
            });
        });
        
        return usage;
    }
    
    /**
     * Get statistics about gear usage in favorites
     */
    public static getGearStatistics(favorites: PitchSetup[]): {
        totalSetups: number;
        twoGearSetups: number;
        fourGearSetups: number;
        mostUsedGears: Array<{gear: string, count: number}>;
        gearsByPosition: {
            A: Map<string, number>;
            B: Map<string, number>;
            C: Map<string, number>;
            D: Map<string, number>;
        };
    } {
        const usage = this.analyzeGearUsage(favorites);
        const mostUsed = Array.from(usage.entries())
            .map(([gear, count]) => ({gear, count}))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        
        const gearsByPosition = {
            A: new Map<string, number>(),
            B: new Map<string, number>(),
            C: new Map<string, number>(),
            D: new Map<string, number>()
        };
        
        let twoGearCount = 0;
        let fourGearCount = 0;
        
        favorites.forEach(setup => {
            const is2Gear = setup.gearB === undefined && setup.gearC === undefined;
            if (is2Gear) {
                twoGearCount++;
            } else {
                fourGearCount++;
            }
            
            if (setup.gearA) {
                const key = setup.gearA.toString();
                gearsByPosition.A.set(key, (gearsByPosition.A.get(key) || 0) + 1);
            }
            if (setup.gearB) {
                const key = setup.gearB.toString();
                gearsByPosition.B.set(key, (gearsByPosition.B.get(key) || 0) + 1);
            }
            if (setup.gearC) {
                const key = setup.gearC.toString();
                gearsByPosition.C.set(key, (gearsByPosition.C.get(key) || 0) + 1);
            }
            if (setup.gearD) {
                const key = setup.gearD.toString();
                gearsByPosition.D.set(key, (gearsByPosition.D.get(key) || 0) + 1);
            }
        });
        
        return {
            totalSetups: favorites.length,
            twoGearSetups: twoGearCount,
            fourGearSetups: fourGearCount,
            mostUsedGears: mostUsed,
            gearsByPosition
        };
    }
}

