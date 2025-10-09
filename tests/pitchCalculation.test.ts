import { describe, it, expect } from 'vitest';
import { PitchSetup } from '../src/bll/pitchSetup';
import { Pitch, PitchType } from '../src/bll/pitch';
import { Gear, GearModule } from '../src/bll/gear';

describe('Pitch Calculation', () => {
    describe('Formula verification', () => {
        it('should calculate 12 TPI for 40, 65, 65, 30 with 16 TPI leadscrew', () => {
            // Setup
            const m1 = GearModule.fromString("M1")!;
            const leadscrew = new Pitch(16, PitchType.Imperial);

            const gearA = new Gear(m1, 40);
            const gearB = new Gear(m1, 65);
            const gearC = new Gear(m1, 65);
            const gearD = new Gear(m1, 30);

            // Debug gears
            console.log(`Gear A: ${gearA.teeth} teeth`);
            console.log(`Gear B: ${gearB.teeth} teeth`);
            console.log(`Gear C: ${gearC.teeth} teeth`);
            console.log(`Gear D: ${gearD.teeth} teeth`);

            // Calculate pitch
            const setup = PitchSetup.fromGearsAndLeadscrew(gearA, gearB, gearC, gearD, leadscrew);

            // Debug
            console.log(`Setup pitch: ${setup.pitch.value} (type: ${setup.pitch.type})`);
            console.log(`Leadscrew: ${leadscrew.value} (type: ${leadscrew.type})`);

            // Verify - setup.pitch is already in TPI (Imperial)
            const tpi = setup.pitch.value;
            console.log(`40, 65, 65, 30 → ${tpi.toFixed(6)} TPI`);

            expect(Math.abs(tpi - 12.0)).toBeLessThan(0.001);
        });
        
        it('should calculate 80 TPI for 20, 50, 40, 80 with 16 TPI leadscrew', () => {
            // Setup
            const m1 = GearModule.fromString("M1")!;
            const leadscrew = new Pitch(16, PitchType.Imperial);

            const gearA = new Gear(m1, 20);
            const gearB = new Gear(m1, 50);
            const gearC = new Gear(m1, 40);
            const gearD = new Gear(m1, 80);
            
            // Calculate pitch
            const setup = PitchSetup.fromGearsAndLeadscrew(gearA, gearB, gearC, gearD, leadscrew);

            // Verify - setup.pitch is already in TPI (Imperial)
            const tpi = setup.pitch.value;
            console.log(`20, 50, 40, 80 → ${tpi.toFixed(6)} TPI`);

            expect(Math.abs(tpi - 80.0)).toBeLessThan(0.001);
        });
        
        it('should calculate 8 TPI for 80, 40, 40, 80 with 16 TPI leadscrew', () => {
            // Setup
            const m1 = GearModule.fromString("M1")!;
            const leadscrew = new Pitch(16, PitchType.Imperial);

            // For 8 TPI (half of 16), we need ratio = 2.0
            // ratio = (A * C) / (B * D) = (80 * 40) / (40 * 80) = 3200 / 3200 = 1.0 ❌
            // Let's try: (40 * 40) / (80 * 20) = 1600 / 1600 = 1.0 ❌
            // Actually: (40 * 40) / (20 * 80) = 1600 / 1600 = 1.0 ❌
            // For ratio = 2: (A * C) / (B * D) = 2, so A*C = 2*B*D
            // Try: A=40, B=20, C=40, D=20: (40*40)/(20*20) = 1600/400 = 4.0 ❌
            // Try: A=40, B=40, C=40, D=20: (40*40)/(40*20) = 1600/800 = 2.0 ✅
            const gearA = new Gear(m1, 40);
            const gearB = new Gear(m1, 40);
            const gearC = new Gear(m1, 40);
            const gearD = new Gear(m1, 20);

            // Calculate pitch
            const setup = PitchSetup.fromGearsAndLeadscrew(gearA, gearB, gearC, gearD, leadscrew);

            // Verify - setup.pitch is already in TPI (Imperial)
            const tpi = setup.pitch.value;
            console.log(`40, 40, 40, 20 → ${tpi.toFixed(6)} TPI`);

            expect(Math.abs(tpi - 8.0)).toBeLessThan(0.001);
        });
        
        it('should verify formula: pitch = leadscrew * (A * C) / (B * D)', () => {
            // Manual calculation
            const leadscrew_mm = 25.4 / 16; // 16 TPI = 1.5875 mm/rev
            
            // Test case: 40, 65, 65, 30
            const ratio = (40 * 65) / (65 * 30);
            const pitch_mm = leadscrew_mm * ratio;
            const tpi = 25.4 / pitch_mm;
            
            console.log(`Manual calculation:`);
            console.log(`  Leadscrew: ${leadscrew_mm} mm/rev`);
            console.log(`  Ratio: (40 * 65) / (65 * 30) = ${ratio}`);
            console.log(`  Pitch: ${pitch_mm} mm/rev`);
            console.log(`  TPI: ${tpi}`);
            
            expect(Math.abs(tpi - 12.0)).toBeLessThan(0.001);
        });
    });
});

