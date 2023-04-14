import { Gear, GearModule, Gears } from "./gear";
import { PitchType, Pitch } from "./pitch";

export default class LatheConfig {
    public leadscrew: Pitch = new Pitch(1.6, PitchType.Metric);
    public minTeeth: number = 82;
    public maxSize: number = 90;
    public geartrainSize: number = 2;
    public gears: Gear[] = Gears.listFromTeeth([20,20,30,35,40,40,45,50,55,57,60,65,80,80], GearModule.fromString("M1")!);

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
            geartrainSize: this.geartrainSize
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
        return result;
    }
}