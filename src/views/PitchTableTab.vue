<template>
    <div class="box pitch-table-wrapper"
         :style="{
           '--gear-a-color': config.gearColors.gearA,
           '--gear-b-color': config.gearColors.gearB,
           '--gear-c-color': config.gearColors.gearC,
           '--gear-d-color': config.gearColors.gearD
         }">
        <!-- Recalculation Banner -->
        <RecalculationBanner
            ref="recalcBanner"
            @recalculate="handleRecalculation"
            message="Settings have changed. Recalculate favorites for optimal gear combinations?"
            buttonText="Recalculate Favorites" />

        <div class="block">
            <p>{{ i18n.ptTitle }}</p>
        </div>
      <div class="columns column-table">
        <div class="column">
            <div class="block">
                <div class="title is-3">{{ i18n.ptMetricCoarse }}</div>
                <DataGrid v-model="metricModel" v-model:columns="cols" :is-sortable="false" :selection-mode="GridSelectionMode.One" v-model:selectedItems="selectedItems" :isExportEnabled="isExportEnabled" :isPrintEnabled="isPrintEnabled" :row-commands="rowCommands" :exportText="i18n.genericExportCsv" :emptyText="i18n.genericEmpty" :downloader="ref(downloader)"/>
            </div>
            <div class="block">
                <div class="title is-3">{{ i18n.ptMetricFine }}</div>
                <DataGrid v-model="metricFineModel" v-model:columns="cols" :is-sortable="false" :selection-mode="GridSelectionMode.One" v-model:selectedItems="selectedItems" :isExportEnabled="isExportEnabled" :isPrintEnabled="isPrintEnabled" :row-commands="rowCommands" :exportText="i18n.genericExportCsv" :emptyText="i18n.genericEmpty" :downloader="ref(downloader)"/>
            </div>
            <div class="block">
                <div class="title is-3">{{ i18n.ptMetricSuperfine }}</div>
                <DataGrid v-model="metricSFineModel" v-model:columns="cols" :is-sortable="false" :selection-mode="GridSelectionMode.One" v-model:selectedItems="selectedItems" :isExportEnabled="isExportEnabled" :isPrintEnabled="isPrintEnabled" :row-commands="rowCommands" :exportText="i18n.genericExportCsv" :emptyText="i18n.genericEmpty" :downloader="ref(downloader)"/>
            </div>
            <div class="block">
                <div class="title is-3">{{ i18n.ptImperialCoarse }}</div>
                <DataGrid v-model="imperialModel" v-model:columns="cols" :is-sortable="false" :selection-mode="GridSelectionMode.One" v-model:selectedItems="selectedItems" :isExportEnabled="isExportEnabled" :isPrintEnabled="isPrintEnabled" :row-commands="rowCommands" :exportText="i18n.genericExportCsv" :emptyText="i18n.genericEmpty" :downloader="ref(downloader)"/>
            </div>
            <div class="block">
                <div class="title is-3">{{ i18n.ptImperialFine }}</div>
                <DataGrid v-model="imperialFineModel" v-model:columns="cols" :is-sortable="false" :selection-mode="GridSelectionMode.One" v-model:selectedItems="selectedItems" :isExportEnabled="isExportEnabled" :isPrintEnabled="isPrintEnabled" :row-commands="rowCommands" :exportText="i18n.genericExportCsv" :emptyText="i18n.genericEmpty" :downloader="ref(downloader)"/>
            </div>
            <div class="block">
                <div class="title is-3">{{ i18n.ptBritishPipe }}</div>
                <DataGrid v-model="bspModel" v-model:columns="cols" :is-sortable="false" :selection-mode="GridSelectionMode.One" v-model:selectedItems="selectedItems" :isExportEnabled="isExportEnabled" :isPrintEnabled="isPrintEnabled" :row-commands="rowCommands" :exportText="i18n.genericExportCsv" :emptyText="i18n.genericEmpty" :downloader="ref(downloader)"/>
            </div>
        </div>
        <div class="column no-print">
            <GeartrainImg
                :gear-a="selectedSetup?.gearA ?? undefined"
                :gear-b="selectedSetup?.gearB ?? undefined"
                :gear-c="selectedSetup?.gearC ?? undefined"
                :gear-d="selectedSetup?.gearD ?? undefined"
                :min-teeth="config.minTeeth"/>
            <div class="block" style="margin-top: 20px;">
                <img src="/resources/gears3.svg" alt="Gear diagram" style="width: 100%; max-width: 500px;" />
            </div>
        </div>
      </div>
    </div>
</template>
<script lang="ts">
import { Pitch, PitchType } from '@/bll/pitch';
import { PitchSetup } from '@/bll/pitchSetup';
import GeartrainImg from '@/components/Graphics/GeartrainImg.vue';
import GlobalConfig from '@/bll/globalConfig';
import DataGrid, { GridSelectionMode } from '@rozzy/vue-datagrid/src/DataGrid.vue';
import { GridColumnDefinition } from '@rozzy/vue-datagrid/src/GridColumnDefinition';
import { AddToFavoritesRowCommand, RemoveFavoriteRowCommand } from '@/components/PitchSetupTable.vue';
import RecalculationBanner from '@/components/RecalculationBanner.vue';
import { Gear } from '@/bll/gear';
import { GearHelper, PitchHelper } from '@/components/gridHelpers';
import { DeviceHelper } from '@/bll/device';
import GCDownloader from '@/grid/Downloader';
import type { GridRowCommandDefinition } from '@rozzy/vue-datagrid/src/GridCommandDefinition';
import { ref } from 'vue';
import { GearOptimizer } from '@/bll/gearOptimizer';
import { WorkerClient } from '@/bll/backgroundWorker';

class NamedPitchSetup extends PitchSetup {
    public name: string = null!;

    public static fromSetup(s: PitchSetup): NamedPitchSetup {
        return new NamedPitchSetup(s.gearA, s.gearB, s.gearC, s.gearD, s.pitch);
    }

    public withName(name: string): NamedPitchSetup {
        this.name = name;
        return this;
    }

    public withType(type: PitchType): NamedPitchSetup {
        if (this.pitch.type != type)
            this.pitch = this.pitch.convert();
        return this;
    }
}

export default {
    data(){
        const i18n = GlobalConfig.i18n;
        const downloader = new GCDownloader();

        // Create worker client for recalculation
        // Note: Worker client is created without progress callback initially
        // The progress callback will be set dynamically in handleRecalculation
        const recalcWorkerClient = new WorkerClient<PitchSetup[]>();

        return {
            recalcWorkerClient,
            selectedSetup: new NamedPitchSetup(Gear.fromString("M1Z20"), undefined, undefined, Gear.fromString("M1Z80"), new Pitch(1, PitchType.Metric)),
            cols: [
                new GridColumnDefinition("name", i18n.ptName, i => i.name),
                new GridColumnDefinition("a", "A", i => i.gearA)
                    .withFormat(GearHelper.formatFn)
                    .withExportFn(g => g.toString())
                    .withSortForValues(GearHelper.sortFn)
                    .withStyle("width: 10%")
                    .withCssClasses(['gear-a-color'])
                    .withAlignRight().withHeaderAlignRight(),
                new GridColumnDefinition("b", "B", i => i.gearB)
                    .withFormat(GearHelper.formatFn)
                    .withExportFn(g => g.toString())
                    .withSortForValues(GearHelper.sortFn)
                    .withStyle("width: 10%")
                    .withCssClasses(['gear-b-color'])
                    .withAlignRight().withHeaderAlignRight(),
                new GridColumnDefinition("c", "C", i => i.gearC)
                    .withFormat(GearHelper.formatFn)
                    .withExportFn(g => g.toString())
                    .withSortForValues(GearHelper.sortFn)
                    .withStyle("width: 10%")
                    .withCssClasses(['gear-c-color'])
                    .withAlignRight().withHeaderAlignRight(),
                new GridColumnDefinition("d", "D", i => i.gearD)
                    .withFormat(GearHelper.formatFn)
                    .withExportFn(g => g.toString())
                    .withSortForValues(GearHelper.sortFn)
                    .withStyle("width: 10%")
                    .withCssClasses(['gear-d-color'])
                    .withAlignRight().withHeaderAlignRight(),
                new GridColumnDefinition("p", "P", i => i.pitch, i18n.genericPitch)
                    .withFormat(PitchHelper.formatFn)
                    .withStyle("width: 30%").withAlignRight().withHeaderAlignRight(),
            ],
            isPrintEnabled: false,
            metricModel: [] as NamedPitchSetup[],
            metricFineModel: [] as NamedPitchSetup[],
            metricSFineModel: [] as NamedPitchSetup[],
            imperialModel: [] as NamedPitchSetup[],
            imperialFineModel: [] as NamedPitchSetup[],
            bspModel: [] as NamedPitchSetup[],
            rowCommands: [new AddToFavoritesRowCommand(), new RemoveFavoriteRowCommand()] as GridRowCommandDefinition[],
            isExportEnabled: true,
            config: GlobalConfig.config,
            downloader,
            i18n,
            ref: ref,
            GridSelectionMode: GridSelectionMode
        }
    },
    mounted() {
        this.computeModel();
    },
    async created() {
        this.isPrintEnabled = !await DeviceHelper.isNativeApp();
    },
    methods: {
        async handleRecalculation(progressCallback: (progress: number) => void) {
            console.log('[PitchTableTab] handleRecalculation called, progressCallback:', typeof progressCallback);
            try {
                console.log('[PitchTableTab] Calling progressCallback(5)');
                progressCallback(5);

                console.log('[PitchTableTab] Starting background recalculation...');

                // Create worker with progress callback
                const workerPath = import.meta.env.DEV
                    ? '/src/workers/recalculation.ts'
                    : '/recalculation.js';

                this.recalcWorkerClient.createWorker(
                    workerPath,
                    (data: any) => data?.map((i: any) => PitchSetup.fromPlainObject(i)),
                    (working: boolean, progress: number | undefined) => {
                        console.log('[PitchTableTab] Worker progress:', working, progress);
                        if (progress !== undefined) {
                            // Map worker progress (0-1) to percentage (0-100)
                            // Reserve 5-30% for setup, 30-95% for worker, 95-100% for finalization
                            const workerProgress = 30 + (progress * 65);
                            progressCallback(workerProgress);
                        }
                    }
                );

                // Collect auto-favorite candidates (same logic as computeModel)
                const autoFavoriteThreads = this.config.autoFavoriteThreads;
                const autoFavoriteCandidates: Array<{
                    pitch: Pitch,
                    originalPitchType: PitchType,
                    name: string,
                    candidates: PitchSetup[]
                }> = [];

                const thr = 1.003;
                const t = this;

                // Helper function to collect candidates
                function collectCandidates(p: Pitch, name: string) {
                    const originalPitchType = p.type;
                    p = p.type == PitchType.Metric ? p : p.convert();
                    let n = t.combos.filter(s => s.pitch.value > p.value / thr && s.pitch.value < p.value * thr);

                    if(name && autoFavoriteThreads.includes(name)) {
                        autoFavoriteCandidates.push({
                            pitch: p,
                            originalPitchType: originalPitchType,
                            name: name,
                            candidates: n
                        });
                    }
                }

                // Collect all thread candidates (same as computeModel)
                // Metric coarse
                collectCandidates(new Pitch(0.4, PitchType.Metric), "M2");
                collectCandidates(new Pitch(0.45, PitchType.Metric), "M2.5");
                collectCandidates(new Pitch(0.5, PitchType.Metric), "M3");
                collectCandidates(new Pitch(0.7, PitchType.Metric), "M4");
                collectCandidates(new Pitch(0.8, PitchType.Metric), "M5");
                collectCandidates(new Pitch(1.0, PitchType.Metric), "M6");
                collectCandidates(new Pitch(1.25, PitchType.Metric), "M8");
                collectCandidates(new Pitch(1.5, PitchType.Metric), "M10");
                collectCandidates(new Pitch(1.75, PitchType.Metric), "M12");
                collectCandidates(new Pitch(2.0, PitchType.Metric), "M14");
                collectCandidates(new Pitch(2.0, PitchType.Metric), "M16");
                collectCandidates(new Pitch(2.5, PitchType.Metric), "M20");

                // Metric fine
                collectCandidates(new Pitch(1.0, PitchType.Metric), "M8 Fine");
                collectCandidates(new Pitch(1.25, PitchType.Metric), "M10 Fine");
                collectCandidates(new Pitch(1.25, PitchType.Metric), "M12 Fine");
                collectCandidates(new Pitch(1.5, PitchType.Metric), "M16 Fine");
                collectCandidates(new Pitch(1.5, PitchType.Metric), "M20 Fine");
                collectCandidates(new Pitch(2.0, PitchType.Metric), "M24 Fine");
                collectCandidates(new Pitch(2.0, PitchType.Metric), "M30 Fine");

                // Imperial UNC
                collectCandidates(new Pitch(80, PitchType.Imperial), "UNC #0");
                collectCandidates(new Pitch(64, PitchType.Imperial), "UNC #1");
                collectCandidates(new Pitch(56, PitchType.Imperial), "UNC #2");
                collectCandidates(new Pitch(48, PitchType.Imperial), "UNC #3");
                collectCandidates(new Pitch(40, PitchType.Imperial), "UNC #4");
                collectCandidates(new Pitch(40, PitchType.Imperial), "UNC #5");
                collectCandidates(new Pitch(32, PitchType.Imperial), "UNC #6");
                collectCandidates(new Pitch(32, PitchType.Imperial), "UNC #8");
                collectCandidates(new Pitch(24, PitchType.Imperial), "UNC #10");
                collectCandidates(new Pitch(24, PitchType.Imperial), "UNC #12");
                collectCandidates(new Pitch(20, PitchType.Imperial), "UNC 1/4");
                collectCandidates(new Pitch(18, PitchType.Imperial), "UNC 5/16");
                collectCandidates(new Pitch(16, PitchType.Imperial), "UNC 3/8");
                collectCandidates(new Pitch(14, PitchType.Imperial), "UNC 7/16");
                collectCandidates(new Pitch(13, PitchType.Imperial), "UNC 1/2");
                collectCandidates(new Pitch(12, PitchType.Imperial), "UNC 9/16");
                collectCandidates(new Pitch(11, PitchType.Imperial), "UNC 5/8");
                collectCandidates(new Pitch(9, PitchType.Imperial), "UNC 7/8");
                collectCandidates(new Pitch(8, PitchType.Imperial), "UNC 1");

                // Imperial UNF
                collectCandidates(new Pitch(72, PitchType.Imperial), "UNF #1");
                collectCandidates(new Pitch(64, PitchType.Imperial), "UNF #2");
                collectCandidates(new Pitch(56, PitchType.Imperial), "UNF #3");
                collectCandidates(new Pitch(48, PitchType.Imperial), "UNF #4");
                collectCandidates(new Pitch(44, PitchType.Imperial), "UNF #5");
                collectCandidates(new Pitch(40, PitchType.Imperial), "UNF #6");
                collectCandidates(new Pitch(36, PitchType.Imperial), "UNF #8");
                collectCandidates(new Pitch(32, PitchType.Imperial), "UNF #10");
                collectCandidates(new Pitch(28, PitchType.Imperial), "UNF #12");
                collectCandidates(new Pitch(28, PitchType.Imperial), "UNF 1/4");
                collectCandidates(new Pitch(24, PitchType.Imperial), "UNF 5/16");
                collectCandidates(new Pitch(24, PitchType.Imperial), "UNF 3/8");
                collectCandidates(new Pitch(20, PitchType.Imperial), "UNF 7/16");
                collectCandidates(new Pitch(20, PitchType.Imperial), "UNF 1/2");
                collectCandidates(new Pitch(18, PitchType.Imperial), "UNF 9/16");
                collectCandidates(new Pitch(18, PitchType.Imperial), "UNF 5/8");
                collectCandidates(new Pitch(16, PitchType.Imperial), "UNF 3/4");
                collectCandidates(new Pitch(14, PitchType.Imperial), "UNF 7/8");
                collectCandidates(new Pitch(12, PitchType.Imperial), "UNF 1");
                collectCandidates(new Pitch(12, PitchType.Imperial), "UNF 1 1/8");
                collectCandidates(new Pitch(12, PitchType.Imperial), "UNF 1 1/4");

                progressCallback(20);

                console.log(`[PitchTableTab] Collected ${autoFavoriteCandidates.length} thread candidates`);

                // Prepare data for worker
                const workerInput = {
                    threads: autoFavoriteCandidates.map(t => ({
                        targetPitch: t.pitch.value,
                        name: t.name,
                        originalPitchType: t.originalPitchType,
                        candidates: t.candidates.map(c => c.toPlainObject())
                    }))
                };

                progressCallback(30);

                // Run worker with longer timeout (60 seconds)
                console.log('[PitchTableTab] Calling runWorker...');
                const optimizedFavorites = await this.recalcWorkerClient.runWorker(workerInput, 60000);

                console.log('[PitchTableTab] runWorker returned, type:', typeof optimizedFavorites, 'value:', optimizedFavorites);
                progressCallback(80);

                console.log(`[PitchTableTab] Worker returned ${optimizedFavorites?.length ?? 'undefined'} optimized favorites`);

                // Clear auto-favorites and add new ones
                GlobalConfig.clearAutoFavorites();

                if (Array.isArray(optimizedFavorites)) {
                    console.log('[PitchTableTab] Adding', optimizedFavorites.length, 'favorites...');
                    optimizedFavorites.forEach(setup => {
                        GlobalConfig.addFavorite(setup);
                    });
                    console.log('[PitchTableTab] Favorites added, total favorites now:', GlobalConfig.favorites.length);
                } else {
                    console.error('[PitchTableTab] optimizedFavorites is not an array!', optimizedFavorites);
                }

                progressCallback(95);

                // Small delay to show completion
                await new Promise(resolve => setTimeout(resolve, 200));

                progressCallback(100);

                console.log('[PitchTableTab] Recalculation complete');
            } catch (error) {
                console.error('[PitchTableTab] Recalculation error:', error);
                progressCallback(100); // Complete even on error
            }
        },

        computeModel() {
            const result: NamedPitchSetup[] = [];
            const thr = 1.003;
            const t = this;

            t.metricModel = [];
            t.metricFineModel = [];
            t.metricSFineModel = [];
            t.imperialModel = [];
            t.imperialFineModel = [];
            t.bspModel = [];

            // Get auto-favorite thread names from configuration
            const autoFavoriteThreads = this.config.autoFavoriteThreads;

            // Collect all auto-favorite candidates for batch optimization
            const autoFavoriteCandidates: Array<{
                pitch: Pitch,
                originalPitchType: PitchType,
                name: string,
                candidates: PitchSetup[]
            }> = [];

            // Calculate best setup for a thread
            function f(p: Pitch, name: string){
                let type = p.type;
                const originalPitchType = p.type; // Store original type before conversion
                p = p.type == PitchType.Metric ? p : p.convert();
                let n  = t.combos.filter(s => s.pitch.value > p.value / thr && s.pitch.value < p.value * thr);

                // If this is an auto-favorite, collect candidates for batch optimization
                if(name && autoFavoriteThreads.includes(name)) {
                    autoFavoriteCandidates.push({
                        pitch: p,
                        originalPitchType: originalPitchType, // Store original type
                        name: name,
                        candidates: n
                    });
                }

                // For now, just pick the most accurate one for display
                // (will be replaced by optimized version for auto-favorites)
                const bestSetup = GearOptimizer.selectBest(n, p.value, []);

                return bestSetup != null
                    ? NamedPitchSetup.fromSetup(bestSetup).withName(name).withType(type)
                    : null;
            }

            function a(s: NamedPitchSetup | null, arr: NamedPitchSetup[]) {
                if(s == null)
                    return;
                arr.push(s);
            }

            a(f(new Pitch(0.35, PitchType.Metric), "M1.6"), this.metricModel);
            a(f(new Pitch(0.40, PitchType.Metric), "M2"), this.metricModel);
            a(f(new Pitch(0.45, PitchType.Metric), "M2.5"), this.metricModel);
            a(f(new Pitch(0.50, PitchType.Metric), "M3"), this.metricModel);
            a(f(new Pitch(0.70, PitchType.Metric), "M4"), this.metricModel);
            a(f(new Pitch(0.80, PitchType.Metric), "M5"), this.metricModel);
            a(f(new Pitch(1.00, PitchType.Metric), "M6"), this.metricModel);
            a(f(new Pitch(1.25, PitchType.Metric), "M8"), this.metricModel);
            a(f(new Pitch(1.50, PitchType.Metric), "M10"), this.metricModel);
            a(f(new Pitch(1.75, PitchType.Metric), "M12"), this.metricModel);
            a(f(new Pitch(2.00, PitchType.Metric), "M14"), this.metricModel);
            a(f(new Pitch(2.00, PitchType.Metric), "M16"), this.metricModel);
            a(f(new Pitch(2.50, PitchType.Metric), "M20"), this.metricModel);
            a(f(new Pitch(3.00, PitchType.Metric), "M24"), this.metricModel);
            a(f(new Pitch(3.00, PitchType.Metric), "M27"), this.metricModel);
            a(f(new Pitch(3.50, PitchType.Metric), "M30"), this.metricModel);
            a(f(new Pitch(3.50, PitchType.Metric), "M33"), this.metricModel);
            a(f(new Pitch(4.00, PitchType.Metric), "M36"), this.metricModel);
            a(f(new Pitch(4.00, PitchType.Metric), "M39"), this.metricModel);
            
            a(f(new Pitch(1.00, PitchType.Metric), "M8 Fine"), this.metricFineModel);
            a(f(new Pitch(1.25, PitchType.Metric), "M10 Fine"), this.metricFineModel);
            a(f(new Pitch(1.50, PitchType.Metric), "M12 Fine"), this.metricFineModel);
            a(f(new Pitch(1.50, PitchType.Metric), "M16 Fine"), this.metricFineModel);
            a(f(new Pitch(1.50, PitchType.Metric), "M20 Fine"), this.metricFineModel);
            a(f(new Pitch(2.00, PitchType.Metric), "M24 Fine"), this.metricFineModel);
            a(f(new Pitch(2.00, PitchType.Metric), "M30 Fine"), this.metricFineModel);
            a(f(new Pitch(3.00, PitchType.Metric), "M36 Fine"), this.metricFineModel);
            a(f(new Pitch(3.00, PitchType.Metric), "M39 Fine"), this.metricFineModel);

            a(f(new Pitch(1.00, PitchType.Metric), "M10 Super fine"), this.metricSFineModel);
            a(f(new Pitch(1.25, PitchType.Metric), "M12 Super fine"), this.metricSFineModel);

            a(f(new Pitch(80, PitchType.Imperial), "UNC #0"), this.imperialModel);
            a(f(new Pitch(64, PitchType.Imperial), "UNC #1"), this.imperialModel);
            a(f(new Pitch(56, PitchType.Imperial), "UNC #2"), this.imperialModel);
            a(f(new Pitch(48, PitchType.Imperial), "UNC #3"), this.imperialModel);
            a(f(new Pitch(40, PitchType.Imperial), "UNC #4"), this.imperialModel);
            a(f(new Pitch(40, PitchType.Imperial), "UNC #5"), this.imperialModel);
            a(f(new Pitch(32, PitchType.Imperial), "UNC #6"), this.imperialModel);
            a(f(new Pitch(32, PitchType.Imperial), "UNC #8"), this.imperialModel);
            a(f(new Pitch(24, PitchType.Imperial), "UNC #10"), this.imperialModel);
            a(f(new Pitch(24, PitchType.Imperial), "UNC #12"), this.imperialModel);
            a(f(new Pitch(20, PitchType.Imperial), "UNC 1/4"), this.imperialModel);
            a(f(new Pitch(18, PitchType.Imperial), "UNC 5/16"), this.imperialModel);
            a(f(new Pitch(16, PitchType.Imperial), "UNC 3/8"), this.imperialModel);
            a(f(new Pitch(14, PitchType.Imperial), "UNC 7/16"), this.imperialModel);
            a(f(new Pitch(13, PitchType.Imperial), "UNC 1/2"), this.imperialModel);
            a(f(new Pitch(12, PitchType.Imperial), "UNC 9/16"), this.imperialModel);
            a(f(new Pitch(11, PitchType.Imperial), "UNC 5/8"), this.imperialModel);
            a(f(new Pitch(10, PitchType.Imperial), "UNC 3/4"), this.imperialModel);
            a(f(new Pitch(9 , PitchType.Imperial), "UNC 7/8"), this.imperialModel);
            a(f(new Pitch(8 , PitchType.Imperial), "UNC 1"), this.imperialModel);
            a(f(new Pitch(7 , PitchType.Imperial), "UNC 1 1/8"), this.imperialModel);
            a(f(new Pitch(7 , PitchType.Imperial), "UNC 1 1/4"), this.imperialModel);
            a(f(new Pitch(6 , PitchType.Imperial), "UNC 1 1/2"), this.imperialModel);

            a(f(new Pitch(72, PitchType.Imperial), "UNF #1"), this.imperialFineModel);
            a(f(new Pitch(64, PitchType.Imperial), "UNF #2"), this.imperialFineModel);
            a(f(new Pitch(56, PitchType.Imperial), "UNF #3"), this.imperialFineModel);
            a(f(new Pitch(48, PitchType.Imperial), "UNF #4"), this.imperialFineModel);
            a(f(new Pitch(44, PitchType.Imperial), "UNF #5"), this.imperialFineModel);
            a(f(new Pitch(40, PitchType.Imperial), "UNF #6"), this.imperialFineModel);
            a(f(new Pitch(36, PitchType.Imperial), "UNF #8"), this.imperialFineModel);
            a(f(new Pitch(32, PitchType.Imperial), "UNF #10"), this.imperialFineModel);
            a(f(new Pitch(28, PitchType.Imperial), "UNF #12"), this.imperialFineModel);
            a(f(new Pitch(28, PitchType.Imperial), "UNF 1/4"), this.imperialFineModel);
            a(f(new Pitch(24, PitchType.Imperial), "UNF 5/16"), this.imperialFineModel);
            a(f(new Pitch(24, PitchType.Imperial), "UNF 3/8"), this.imperialFineModel);
            a(f(new Pitch(20, PitchType.Imperial), "UNF 7/16"), this.imperialFineModel);
            a(f(new Pitch(20, PitchType.Imperial), "UNF 1/2"), this.imperialFineModel);
            a(f(new Pitch(18, PitchType.Imperial), "UNF 9/16"), this.imperialFineModel);
            a(f(new Pitch(18, PitchType.Imperial), "UNF 5/8"), this.imperialFineModel);
            a(f(new Pitch(16, PitchType.Imperial), "UNF 3/4"), this.imperialFineModel);
            a(f(new Pitch(14, PitchType.Imperial), "UNF 7/8"), this.imperialFineModel);
            a(f(new Pitch(14, PitchType.Imperial), "UNF 1"), this.imperialFineModel);
            a(f(new Pitch(12, PitchType.Imperial), "UNF 1 1/8"), this.imperialFineModel);
            a(f(new Pitch(11, PitchType.Imperial), "UNF 1 1/4"), this.imperialFineModel);
            a(f(new Pitch(10, PitchType.Imperial), "UNF 1 1/2"), this.imperialFineModel);
            
            a(f(new Pitch(28, PitchType.Imperial), "G 1/8"), this.bspModel);
            a(f(new Pitch(19, PitchType.Imperial), "G 1/4"), this.bspModel);
            a(f(new Pitch(19, PitchType.Imperial), "G 3/8"), this.bspModel);
            a(f(new Pitch(14, PitchType.Imperial), "G 1/2"), this.bspModel);
            a(f(new Pitch(14, PitchType.Imperial), "G 3/4"), this.bspModel);
            a(f(new Pitch(11, PitchType.Imperial), "G 1"), this.bspModel);
            a(f(new Pitch(11, PitchType.Imperial), "G 1 1/4"), this.bspModel);
            a(f(new Pitch(11, PitchType.Imperial), "G 1 1/2"), this.bspModel);

            // DON'T run batch optimization here - it locks up the browser!
            // Instead, the user will click "Recalculate Favorites" button
            // which runs optimization in a background worker
            console.log('[PitchTableTab] computeModel: Collected', autoFavoriteCandidates.length, 'auto-favorite candidates');
            console.log('[PitchTableTab] computeModel: Use "Recalculate Favorites" button to optimize');

            return result;
        },
    },
    computed: {
        combos() {
            // Always reference GlobalConfig.combos so updates are reflected
            return GlobalConfig.combos;
        },
        selectedItems: {
            get(): NamedPitchSetup[] { return [this.selectedSetup]; },
            set(v: NamedPitchSetup[]) { this.selectedSetup = v[0]; }
        },
        isMultiModule() {
            return this.config.isMultiModule;
        }
    },
    components: { GeartrainImg, DataGrid, RecalculationBanner }
}
</script>

<style>
/* Gear color classes for PitchTableTab - use CSS variables from wrapper */
.pitch-table-wrapper .gear-a-color {
    color: var(--gear-a-color) !important;
    font-weight: 600 !important;
}

.pitch-table-wrapper .gear-b-color {
    color: var(--gear-b-color) !important;
    font-weight: 600 !important;
}

.pitch-table-wrapper .gear-c-color {
    color: var(--gear-c-color) !important;
    font-weight: 600 !important;
}

.pitch-table-wrapper .gear-d-color {
    color: var(--gear-d-color) !important;
    font-weight: 600 !important;
}
</style>