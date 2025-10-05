import { Gear, GearModule, Gears } from "./gear";
import { PitchType, Pitch } from "./pitch";

export default class LatheConfig {
    public leadscrew: Pitch = new Pitch(16, PitchType.Imperial);
    public minTeeth: number = 82;
    public maxSize: number = 90;
    public geartrainSize: number = 2;
    public gears: Gear[] = Gears.listFromTeeth([20,20,20,21,25,30,35,40,40,45,45,48,50,50,54,55,57,60,60,65,72,80,80], GearModule.fromString("M1")!);

    // Auto-favorite configuration - now using thread names instead of TPI/pitch values
    public autoFavoriteThreads: string[] = [
        // Imperial UNC
        "UNC #0", "UNC #1", "UNC #2", "UNC #3", "UNC #4", "UNC #5", "UNC #6", "UNC #8",
        "UNC #10", "UNC #12", "UNC 1/4", "UNC 5/16", "UNC 3/8", "UNC 7/16", "UNC 1/2",
        "UNC 9/16", "UNC 5/8", "UNC 7/8", "UNC 1",
        // Imperial UNF
        "UNF #1", "UNF #2", "UNF #3", "UNF #4", "UNF #5", "UNF #6", "UNF #8", "UNF #10",
        "UNF #12", "UNF 1/4", "UNF 5/16", "UNF 3/8", "UNF 7/16", "UNF 1/2", "UNF 9/16",
        "UNF 5/8", "UNF 3/4", "UNF 7/8", "UNF 1", "UNF 1 1/8", "UNF 1 1/4",
        // Metric Coarse
        "M2", "M2.5", "M3", "M4", "M5", "M6", "M8", "M10", "M12", "M14", "M16", "M20",
        // Metric Fine
        "M8 Fine", "M10 Fine", "M12 Fine", "M16 Fine", "M20 Fine", "M24 Fine", "M30 Fine"
    ];

    // Gear color configuration
    public gearColors = {
        gearA: "#aa3636", // Light red
        gearB: "#349334", // Light green
        gearC: "#365794", // Light blue
        gearD: "#ab723d"  // Light orange
    };

    public get isMultiModule() {
        return this.gears.length == 0 ? false : !this.gears.every(g => g.module.equals(this.gears[0].module));
    }

    public get sampleModule() {
        return this.gears.length == 0
            ? GearModule.fromString("M1")! 
            : this.gears[0].module;
    }

    public toString(): string {
        const gears = this.gears.sort();
        let gearsStr = "";
        for (let i = 0; i < this.gears.length; i++){
            gearsStr += gears[i];
            if(i < gears.length - 1)
                gearsStr += ", ";
        }
        return "Pitch: " + this.leadscrew + "\n" + "Gears: " + gearsStr;
    }

    public toPlainObject() {
        return {
            gears: this.gears.map(g => g.toString()),
            leadscrew: this.leadscrew.toPlainObject(),
            minTeeth: this.minTeeth,
            maxSize: this.maxSize,
            geartrainSize: this.geartrainSize,
            autoFavoriteThreads: this.autoFavoriteThreads,
            gearColors: this.gearColors
        };
    }

    public static fromPlainObject(o: any) {
        const result = new LatheConfig();
        result.gears = (o.gears.length > 0 && typeof(o.gears[0]) == "number")
            ? Gears.listFromTeeth(o.gears, GearModule.fromString("M1")!)
            : o.gears.map((g: string) => Gear.fromString(g));
        result.leadscrew = Pitch.fromPlainObject(o.leadscrew)!;
        result.minTeeth = o.minTeeth;
        result.maxSize = o.maxSize;
        result.geartrainSize = o.geartrainSize;

        // Load auto-favorite configuration with defaults if not present
        if (o.autoFavoriteThreads) {
            result.autoFavoriteThreads = o.autoFavoriteThreads;
        }

        // Load gear colors with defaults if not present
        if (o.gearColors) {
            result.gearColors = o.gearColors;
        }

        return result;
    }
}