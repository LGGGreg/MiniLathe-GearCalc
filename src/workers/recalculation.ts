import BackgroundWorker from "@/bll/backgroundWorker"
import { GearOptimizer } from "@/bll/gearOptimizer";
import { PitchSetup } from "@/bll/pitchSetup";
import { Pitch, PitchType } from "@/bll/pitch";

export default {}

const bw = new BackgroundWorker();

bw.initWorker(async (param: any) => {
    console.log('[RecalculationWorker] Starting recalculation...');
    
    // Parse input
    const threads = param.threads.map((t: any) => ({
        targetPitch: t.targetPitch,
        name: t.name,
        originalPitchType: t.originalPitchType,
        candidates: t.candidates.map((c: any) => PitchSetup.fromPlainObject(c))
    }));
    
    bw.reportProgress(0.1);
    
    console.log(`[RecalculationWorker] Processing ${threads.length} threads`);
    
    // Run batch optimization
    const batchInput = threads.map((t: any) => ({
        targetPitch: t.targetPitch,
        name: t.name,
        candidates: t.candidates
    }));
    
    bw.reportProgress(0.3);
    
    const optimizedFavorites = GearOptimizer.selectBestBatch(batchInput);
    
    bw.reportProgress(0.7);
    
    console.log(`[RecalculationWorker] Optimized ${optimizedFavorites.length} favorites`);
    
    // Convert back to original pitch types
    const result = optimizedFavorites.map(({setup, name}) => {
        const thread = threads.find((t: any) => t.name === name);
        const originalPitchType = thread?.originalPitchType;
        
        // Convert pitch to original type if needed
        let finalSetup = setup;
        if (originalPitchType !== undefined && setup.pitch.type !== originalPitchType) {
            finalSetup = new PitchSetup(
                setup.gearA,
                setup.gearB,
                setup.gearC,
                setup.gearD,
                setup.pitch.convert()
            );
        }
        
        // Create named setup
        const namedSetup = PitchSetup.fromPlainObject(finalSetup.toPlainObject());
        (namedSetup as any).name = name;
        
        return namedSetup;
    });
    
    bw.reportProgress(0.9);
    
    console.log('[RecalculationWorker] Recalculation complete');
    
    bw.reportProgress(1.0);
    
    return result;
});

