import { Gear, Gears } from "@/bll/gear"
import GlobalConfig from "@/bll/globalConfig";
import GcMath from "@/bll/math";
import { PitchType, type Pitch } from "@/bll/pitch";

export class GearHelper {

    private static get config() {return GlobalConfig.config; }

    public static sortFn = function(a: Gear, b: Gear) { return Gears.compare(a,b); };
    public static formatFn = function(g: Gear, hideModuleFn: () => boolean = () => false) {
        return g == undefined || g == null ? "" : GearHelper.config.isMultiModule && !hideModuleFn() ? g.toString() : g.teeth.toFixed(0);
    }
}

export class PitchHelper {
    
    public static sortFn = function(a: Pitch, b: Pitch) { return a.value - b.value; }

    private static sortValue(p: Pitch, asc: boolean, prefer: PitchType | undefined = undefined) {
        const v = prefer == undefined || p.type == prefer ?  p.value : p.convert().value;
        const pv = prefer == undefined 
            ? 0
            : asc != (prefer == PitchType.Metric) 
                ? (-p.type) * 1000
                : p.type * 1000;
        return pv+v;
    }
    private static sortFnPreferType(t: PitchType) {
        return (a: Pitch, b: Pitch, asc: boolean = true) => { return PitchHelper.sortValue(a, asc, t) - PitchHelper.sortValue(b, asc, t); };
    }

    public static sortFnPreferMetric = this.sortFnPreferType(PitchType.Metric);
    public static sortFnPreferImperial = this.sortFnPreferType(PitchType.Imperial);

    public static formatFn = function(p: Pitch) {
        return p == null || p == undefined ? "" : GcMath.round(p.value, 0.0001).toFixed(4) + " " + (p.type == PitchType.Metric ? "mm/rev" : "TPI");
    }
    public static formatFnShowMetric = function(p: Pitch) {
        return p == null || p == undefined ? "" : PitchHelper.formatFn(p.type == PitchType.Metric ? p : p.convert());
    }
    public static formatFnShowImperial = function(p: Pitch) {
        return p == null || p == undefined ? "" : PitchHelper.formatFn(p.type == PitchType.Metric ? p.convert() : p);
    }

    // Format functions that grey out non-native pitch types
    // PM column shows metric (mm/rev) - grey out if thread is imperial
    public static formatFnShowMetricGreyed = function(p: Pitch) {
        if (p == null || p == undefined) return "";
        // Ensure type is a number (might be string from JSON)
        const pitchType = Number(p.type);
        const isImperial = pitchType == PitchType.Imperial;
        const text = PitchHelper.formatFn(isImperial ? p.convert() : p);
        // Grey out if original pitch was imperial (converted to metric for display)
        return isImperial
            ? `<span class="pitch-converted">${text}</span>`
            : text;
    }
    // Pi column shows imperial (TPI) - grey out if thread is metric
    public static formatFnShowImperialGreyed = function(p: Pitch) {
        if (p == null || p == undefined) return "";
        // Ensure type is a number (might be string from JSON)
        const pitchType = Number(p.type);
        const isMetric = pitchType == PitchType.Metric;
        const text = PitchHelper.formatFn(isMetric ? p.convert() : p);
        // Grey out if original pitch was metric (converted to imperial for display)
        return isMetric
            ? `<span class="pitch-converted">${text}</span>`
            : text;
    }

    // Export functions that return plain text without HTML formatting
    public static exportFnShowMetric = function(p: Pitch) {
        if (p == null || p == undefined) return "";
        const pitchType = Number(p.type);
        const isImperial = pitchType == PitchType.Imperial;
        return PitchHelper.formatFn(isImperial ? p.convert() : p);
    }

    public static exportFnShowImperial = function(p: Pitch) {
        if (p == null || p == undefined) return "";
        const pitchType = Number(p.type);
        const isMetric = pitchType == PitchType.Metric;
        return PitchHelper.formatFn(isMetric ? p.convert() : p);
    }
}

