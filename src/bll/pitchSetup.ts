import { Gear, Gears } from "./gear";
import type LatheConfig from "./latheConfig";
// import GlobalConfig from "./globalConfig";
import { Pitch, PitchType } from "./pitch";


export class PitchSetup {
    public pitch: Pitch;
    public gearA: Gear | undefined;
    public gearB: Gear | undefined;
    public gearC: Gear | undefined;
    public gearD: Gear | undefined;
    public name?: string; // Optional name for named pitch setups

    public constructor(gearA: Gear | undefined, gearB: Gear | undefined, gearC: Gear | undefined, gearD: Gear | undefined, pitch: number | Pitch, pitchType: PitchType = PitchType.Metric) {
        this.gearA = gearA;
        this.gearB = gearB;
        this.gearC = gearC;
        this.gearD = gearD;

        if (typeof(pitch) == "number")
            this.pitch = new Pitch(pitch as number, pitchType);
        else
            this.pitch = pitch as Pitch;
    }

    public convert(): PitchSetup {
        const converted = new PitchSetup(
            this.gearA,
            this.gearB,
            this.gearC,
            this.gearD,
            this.pitch.convert()
        );
        converted.name = this.name;
        return converted;
    }

    public withName(name: string | undefined): PitchSetup {
        this.name = name;
        return this;
    }

    public isValid(minTeeth: number, minAxleDistanceCD: number = 44, minAxleDistanceAB: number = 34): boolean {
        return this.areGearsProvided() &&
            this.areModulesMatching() &&
            this.areGearsClearingAxles(minTeeth, minAxleDistanceCD, minAxleDistanceAB);
    }

    public areGearsClearingAxles(minTeeth: number, minAxleDistanceCD: number = 44, minAxleDistanceAB: number = 34){
        // True 2-gear setups (B and C undefined) don't need clearance checks
        if (this.gearB == undefined && this.gearC == undefined) {
            return false;
        }

        const pcA = Gears.pitchRadius(this.gearA)!;
        const pcB = Gears.pitchRadius(this.gearB)!;
        const pcC = Gears.pitchRadius(this.gearC)!;
        const pcD = Gears.pitchRadius(this.gearD)!;
        const axleRadius = 8;

        // the banjo can't stretch long enough
        if (pcA + pcB + pcC + pcD <= minTeeth)
            return false;

        // gear B interferes with the leadscrew axle
        if (pcB > pcC + pcD - axleRadius)
            return false;

        // gear C interferes with the driving axle
        if (pcC > pcA + pcB - axleRadius)
            return false;

        // Check minimum distance between C and D axles
        // The distance between C and D axles must be at least the sum of their radii
        // but also must meet the minimum physical constraint
        const requiredDistanceCD = pcC + pcD;
        if (requiredDistanceCD < minAxleDistanceCD)
            return false;

        // Check minimum distance between A and B axles
        // The distance between A and B axles must be at least the sum of their radii
        // but also must meet the minimum physical constraint
        const requiredDistanceAB = pcA + pcB;
        if (requiredDistanceAB < minAxleDistanceAB){
          return false;
        }

        return true;
    }

    public areGearsProvided() : boolean {
        // All 4 gears must be provided (true 2-gear not physically possible)
        return this.gearA != undefined && this.gearB != undefined &&
               this.gearC != undefined && this.gearD != undefined;
    }

    public areModulesMatching(): boolean {
        // All 4 gears must be provided and modules must match
        if (this.gearA == undefined || this.gearB == undefined ||
            this.gearC == undefined || this.gearD == undefined) {
            return false;
        }
        return this.gearA.module.equals(this.gearB.module) &&
               this.gearC.module.equals(this.gearD.module);
    }

    public toString() : string{
        return (this.gearA?.toString() ?? "-") + "\t" 
            + (this.gearB?.toString() ?? "-") + "\t" 
            + (this.gearC?.toString() ?? "-") + "\t" 
            + (this.gearD?.toString() ?? "-") + "\t >> " 
            + this.pitch.toString(0.0001)
    }

    public toPlainObject(): any {
        const obj: any = {
            gearA: this.gearA?.toString(),
            gearB: this.gearB?.toString(),
            gearC: this.gearC?.toString(),
            gearD: this.gearD?.toString(),
            pitch: this.pitch.toPlainObject(),
        };
        if (this.name) {
            obj.name = this.name;
        }
        return obj;
    }

    public equals(s: PitchSetup) {
        return Gears.equal(this.gearA, s.gearA) &&
            Gears.equal(this.gearB, s.gearB) &&
            Gears.equal(this.gearC, s.gearC) &&
            Gears.equal(this.gearD, s.gearD) &&
            (this.pitch.equals(s.pitch) || this.pitch.convert().equals(s.pitch));
    }

    public toMetric() {
        return this.pitch.type == PitchType.Metric ? this : new PitchSetup(this.gearA, this.gearB, this.gearC, this.gearD, this.pitch.toMetric());
    }

    public static fromPlainObject(o: any): PitchSetup {
        const setup = new PitchSetup(
            Gear.fromString(o.gearA)!,
            Gear.fromString(o.gearB),
            Gear.fromString(o.gearC),
            Gear.fromString(o.gearD)!,
            Pitch.fromPlainObject(o.pitch)!);
        if (o.name) {
            setup.name = o.name;
        }
        return setup;
    }

    public static fromGearsAndLeadscrew(gearA: Gear | undefined, gearB: Gear | undefined, gearC: Gear | undefined, gearD: Gear | undefined, leadscrew: Pitch): PitchSetup {
        if (gearA == undefined || gearD == undefined || gearB == undefined || gearC == undefined){
            return new PitchSetup(gearA,gearB,gearC,gearD, new Pitch(0, leadscrew.type));
        }
        // All 4 gears must be provided (true 2-gear not physically possible)
        // Gear train: Spindle → A (driver) → B (driven) → C (driver) → D (driven) → Leadscrew
        // Ratio = (A * C) / (B * D)
        const ratio = (gearA.teeth * gearC.teeth) / (gearB.teeth * gearD.teeth);
        return new PitchSetup(gearA, gearB, gearC, gearD, leadscrew.withRatio(ratio));
    }
}
