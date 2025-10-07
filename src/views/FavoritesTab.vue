<template>
    <div class="box">
        <!-- Recalculation Banner -->
        <RecalculationBanner
            ref="recalcBanner"
            @recalculate="handleRecalculation"
            message="Settings or favorites have changed. Recalculate for optimal gear combinations?"
            buttonText="Recalculate Now" />

        <div class="block">{{ i18n.favTitle }}</div>

        <!-- Optimization Info -->
        <div class="notification is-info is-light">
            <p class="is-size-6">
                <span class="icon">
                    <i class="fas fa-info-circle"></i>
                </span>
                <strong>How favorites are optimized:</strong>
            </p>
            <ul style="margin-left: 2em; margin-top: 0.5em;">
                <li><strong>Pitch Accuracy</strong> - Closest match to target thread pitch (highest priority)</li>
                <li><strong>Simplicity</strong> - Prefers 2-gear setups (B=C) over complex 4-gear setups</li>
                <li><strong>Gear Reuse</strong> - Minimizes gear changes across different threads</li>
                <li><strong>Position Consistency</strong> - Keeps gears in same positions (A, B, C, D) when possible</li>
                <li><strong>Mechanical Advantage</strong> - Prefers largest gear in position D (leadscrew)</li>
                <li><strong>Smooth Operation</strong> - Bonus for gears ≥50 teeth in position D</li>
            </ul>
            <p class="is-size-7" style="margin-top: 0.5em;">
                <em>Click "Recalculate Now" to regenerate favorites with the latest optimization algorithm.</em>
            </p>
        </div>

      <div class="columns">
        <div class="column">
            <PitchSetupTable
                v-model="model"
                v-model:orderBy="orderBy"
                v-model:orderAscending="orderAscending"
                v-model:selectedItem="selectedSetup"
                :isExportEnabled="true"
                :isPrintEnabled="true"
                :showNameColumn="true"
                :row-commands="rowCommands"/>
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
import PitchSetupTable, { AddToFavoritesRowCommand, RemoveFavoriteRowCommand } from '@/components/PitchSetupTable.vue';
import GlobalConfig from '@/bll/globalConfig';
import { Gear } from '@/bll/gear';
import type { GridRowCommandDefinition } from '@rozzy/vue-datagrid/src/GridCommandDefinition';
import RecalculationBanner from '@/components/RecalculationBanner.vue';
import { WorkerClient } from '@/bll/backgroundWorker';


export default {
    data(){
        const rowCommands: GridRowCommandDefinition[] = [new AddToFavoritesRowCommand(), new RemoveFavoriteRowCommand()];

        // Create worker client for recalculation
        const recalcWorkerClient = new WorkerClient<PitchSetup[]>();

        // Sort favorites by category (metric/imperial), then by thread size
        const sortedFavorites = [...GlobalConfig.favorites].sort((a, b) => {
            // Extract category and size from name
            const getCategory = (name?: string) => {
                if (!name) return 'zzz'; // No name goes last
                if (name.startsWith('M')) return 'a-metric'; // M6, M8, M10
                if (name.startsWith('UNC')) return 'b-unc'; // UNC #0, UNC #1
                if (name.startsWith('UNF')) return 'c-unf'; // UNF #1, UNF #2
                if (name.startsWith('BSP')) return 'd-bsp'; // BSP
                return 'e-other';
            };

            const getSize = (name?: string) => {
                if (!name) return 999;
                // Extract number from name (e.g., "M6" -> 6, "UNC #0" -> 0)
                const match = name.match(/([0-9]+(?:\.[0-9]+)?)/);
                return match ? parseFloat(match[1]) : 999;
            };

            const catA = getCategory(a.name);
            const catB = getCategory(b.name);

            if (catA !== catB) {
                return catA.localeCompare(catB);
            }

            // Same category, sort by size
            return getSize(a.name) - getSize(b.name);
        });

        return {
            recalcWorkerClient,
            selectedSetup: new PitchSetup(Gear.fromString("M1Z20"), undefined, undefined, Gear.fromString("M1Z80"), new Pitch(1, PitchType.Metric)),
            orderBy: "name",
            orderAscending: true,
            rowCommands,
            config: GlobalConfig.config,
            model: sortedFavorites,
            i18n: GlobalConfig.i18n
        }
    },
    computed: {
        combos() {
            return GlobalConfig.combos;
        }
    },
    props: {
        desiredPitch: { type: Pitch, default: new Pitch(1, PitchType.Metric) }
    },
    methods: {
        async handleRecalculation(progressCallback: (progress: number) => void) {
            console.log('[FavoritesTab] handleRecalculation called');
            try {
                // Check if combos are available
                if (this.combos.length === 0) {
                    console.error('[FavoritesTab] No combos available! Please calculate gear ratios first.');
                    alert('Please go to the Setup tab and click "Calculate gear ratios" first.');
                    progressCallback(100);
                    return;
                }

                progressCallback(5);

                console.log('[FavoritesTab] Starting background recalculation...');

                // Create worker with progress callback
                const basePath = import.meta.env.BASE_URL || '/';
                const workerPath = import.meta.env.DEV
                    ? `${basePath}src/workers/recalculation.ts`
                    : `${basePath}recalculation.js`;

                this.recalcWorkerClient.createWorker(
                    workerPath,
                    (data: any) => data?.map((i: any) => PitchSetup.fromPlainObject(i)),
                    (working: boolean, progress: number | undefined) => {
                        console.log('[FavoritesTab] Worker progress:', working, progress);
                        if (progress !== undefined) {
                            // Map worker progress (0-1) to percentage (0-100)
                            // Reserve 5-30% for setup, 30-95% for worker, 95-100% for finalization
                            const workerProgress = 30 + (progress * 65);
                            progressCallback(workerProgress);
                        }
                    }
                );

                // Collect auto-favorite candidates (same logic as PitchTableTab)
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

                // Collect all thread candidates (same as PitchTableTab)
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

                console.log(`[FavoritesTab] Collected ${autoFavoriteCandidates.length} thread candidates`);

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

                // Run worker with longer timeout (120 seconds for large gear sets)
                console.log('[FavoritesTab] Calling runWorker...');
                const optimizedFavorites = await this.recalcWorkerClient.runWorker(workerInput, 120000);

                console.log('[FavoritesTab] runWorker returned');
                progressCallback(80);

                console.log(`[FavoritesTab] Worker returned ${optimizedFavorites?.length ?? 'undefined'} optimized favorites`);

                // Clear auto-favorites and add new ones
                GlobalConfig.clearAutoFavorites();

                if (Array.isArray(optimizedFavorites)) {
                    console.log('[FavoritesTab] Adding', optimizedFavorites.length, 'favorites...');
                    optimizedFavorites.forEach(setup => {
                        GlobalConfig.addFavorite(setup);
                    });
                    console.log('[FavoritesTab] Favorites added, total favorites now:', GlobalConfig.favorites.length);

                    // Update the model to show new favorites
                    this.model = [...GlobalConfig.favorites];
                } else {
                    console.error('[FavoritesTab] optimizedFavorites is not an array!', optimizedFavorites);
                }

                progressCallback(95);

                // Small delay to show completion
                await new Promise(resolve => setTimeout(resolve, 200));

                progressCallback(100);

                console.log('[FavoritesTab] Recalculation complete');
            } catch (error) {
                console.error('[FavoritesTab] Recalculation error:', error);

                // Show error message to user
                if (error === 'Timeout') {
                    alert('Recalculation timed out. This can happen with large gear sets. Try reducing the number of gears in Setup, or try again.');
                } else {
                    alert(`Recalculation failed: ${error}`);
                }

                progressCallback(100); // Complete even on error
            }
        }
    },
    components: { GeartrainImg, PitchSetupTable, RecalculationBanner }
}
</script>