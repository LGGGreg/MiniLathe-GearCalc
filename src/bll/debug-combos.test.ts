import { describe, it, expect } from 'vitest';
import CombinationFinder from './combinationFinder';
import LatheConfig from './latheConfig';
import { Gear, GearModule } from './gear';

describe('Debug Combination Generation', () => {
    it('should generate 40, 65, 65, 30', async () => {
        const config = new LatheConfig();
        const finder = new CombinationFinder(() => {}, true); // isWorker=true to skip worker creation

        console.log('=== Gear Collection ===');
        config.gears.forEach((g, i) => {
            console.log(`[${i}] ${g.teeth}T`);
        });

        // Find indices
        const index40 = config.gears.findIndex(g => g.teeth === 40);
        const index65 = config.gears.findIndex(g => g.teeth === 65);
        const index30 = config.gears.findIndex(g => g.teeth === 30);

        console.log('');
        console.log('=== Indices ===');
        console.log(`40T: index ${index40}`);
        console.log(`65T: index ${index65}`);
        console.log(`30T: index ${index30}`);

        // Generate combinations (use synchronous method since we're in worker mode)
        console.log('');
        console.log('=== Generating Combinations ===');
        const combos = finder.findAllCombinations(config);

        console.log(`Total combinations: ${combos.length}`);

        // Look for 40, 65, 65, 30
        const target = combos.find(c =>
            c.gearA?.teeth === 40 &&
            c.gearB?.teeth === 65 &&
            c.gearC?.teeth === 65 &&
            c.gearD?.teeth === 30
        );

        console.log('');
        console.log('=== Target: 40, 65, 65, 30 ===');
        if (target) {
            console.log('✅ FOUND!');
            console.log(`Pitch: ${target.pitch.value} ${target.pitch.type === 1 ? 'TPI' : 'mm/rev'}`);
            console.log(`Valid: ${target.isValid(config.minTeeth)}`);
        } else {
            console.log('❌ NOT FOUND!');
        }

        // Look for 40, 48, 48, 30
        const combo_40_48_48_30 = combos.find(c =>
            c.gearA?.teeth === 40 &&
            c.gearB?.teeth === 48 &&
            c.gearC?.teeth === 48 &&
            c.gearD?.teeth === 30
        );

        console.log('');
        console.log('=== Check 40, 48, 48, 30 ===');
        if (combo_40_48_48_30) {
            console.log('✅ FOUND 40, 48, 48, 30!');
            console.log(`Pitch: ${combo_40_48_48_30.pitch.value} ${combo_40_48_48_30.pitch.type === 1 ? 'TPI' : 'mm/rev'}`);
        } else {
            console.log('❌ NOT FOUND');
        }

        // Look for combinations with B=65, C=65
        const with65 = combos.filter(c =>
            c.gearB?.teeth === 65 && c.gearC?.teeth === 65
        );

        console.log('');
        console.log(`=== Combinations with B=65, C=65: ${with65.length} ===`);
        with65.forEach(c => {
            console.log(`${c.gearA?.teeth}, ${c.gearB?.teeth}, ${c.gearC?.teeth}, ${c.gearD?.teeth}`);
        });

        // Look for ALL B=C combinations with A=40, D=30
        const bc_equal_40_30 = combos.filter(c =>
            c.gearA?.teeth === 40 &&
            c.gearD?.teeth === 30 &&
            c.gearB?.teeth === c.gearC?.teeth
        );

        console.log('');
        console.log(`=== B=C combinations with A=40, D=30: ${bc_equal_40_30.length} ===`);
        bc_equal_40_30.forEach(c => {
            console.log(`${c.gearA?.teeth}, ${c.gearB?.teeth}, ${c.gearC?.teeth}, ${c.gearD?.teeth}`);
        });

        // Look for combinations with A=40, D=30
        const with40_30 = combos.filter(c =>
            c.gearA?.teeth === 40 && c.gearD?.teeth === 30
        );

        console.log('');
        console.log(`=== Combinations with A=40, D=30: ${with40_30.length} ===`);
        with40_30.slice(0, 20).forEach(c => {
            console.log(`${c.gearA?.teeth}, ${c.gearB?.teeth}, ${c.gearC?.teeth}, ${c.gearD?.teeth}`);
        });

        // Manual check: Can we create this combination?
        console.log('');
        console.log('=== Manual Creation ===');
        const m1 = GearModule.fromString("M1")!;
        const gearA = new Gear(m1, 40);
        const gearB = new Gear(m1, 65);
        const gearC = new Gear(m1, 65);
        const gearD = new Gear(m1, 30);

        const manualSetup = finder.findMetricPitch(gearA, gearB, gearC, gearD, config.leadscrew);
        console.log(`Manual pitch: ${manualSetup.pitch.value} ${manualSetup.pitch.type === 1 ? 'TPI' : 'mm/rev'}`);
        console.log(`Manual valid: ${manualSetup.isValid(config.minTeeth)}`);
        console.log(`Manual areGearsProvided: ${manualSetup.areGearsProvided()}`);
        console.log(`Manual areModulesMatching: ${manualSetup.areModulesMatching()}`);
        console.log(`Manual areGearsClearingAxles: ${manualSetup.areGearsClearingAxles(config.minTeeth)}`);

        // Check distance
        const distance = gearA.teeth + gearB.teeth;
        console.log(`Distance: ${gearA.teeth} + ${gearB.teeth} = ${distance}`);
        console.log(`Min teeth: ${config.minTeeth}`);
        console.log(`Valid distance: ${distance >= config.minTeeth}`);

        // Check if the gear at index 19 is actually 65T
        console.log('');
        console.log('=== Gear at index 19 ===');
        console.log(`Gear: ${config.gears[19].teeth}T`);
        console.log(`Module: ${config.gears[19].module.toString()}`);

        // Check if there are multiple 65T gears
        const gears65 = config.gears.filter(g => g.teeth === 65);
        console.log('');
        console.log(`=== 65T gears in collection: ${gears65.length} ===`);
        gears65.forEach((g, i) => {
            const idx = config.gears.indexOf(g);
            console.log(`[${idx}] ${g.teeth}T ${g.module.toString()}`);
        });

        expect(target).toBeDefined();
    });
});

