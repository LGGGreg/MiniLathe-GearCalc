<template>
    <div class="box">
        <!-- Recalculation Banner -->
        <RecalculationBanner
            ref="recalcBanner"
            @recalculate="handleRecalculation"
            message="Settings or favorites have changed. Recalculate for optimal gear combinations?"
            buttonText="Recalculate Now" />

        <div class="block">{{ i18n.favTitle }}</div>
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


export default {
    data(){
        const rowCommands: GridRowCommandDefinition[] = [new AddToFavoritesRowCommand(), new RemoveFavoriteRowCommand()];

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
            selectedSetup: new PitchSetup(Gear.fromString("M1Z20"), undefined, undefined, Gear.fromString("M1Z80"), new Pitch(1, PitchType.Metric)),
            orderBy: "name",
            orderAscending: true,
            rowCommands,
            config: GlobalConfig.config,
            model: sortedFavorites,
            i18n: GlobalConfig.i18n
        }
    },
    props: {
        desiredPitch: { type: Pitch, default: new Pitch(1, PitchType.Metric) }
    },
    methods: {
        async handleRecalculation(progressCallback: (progress: number) => void) {
            try {
                progressCallback(20);

                // Emit event to parent (App.vue) to trigger recalculation in PitchTableTab
                this.$emit('requestRecalculation');

                progressCallback(80);

                // Small delay
                await new Promise(resolve => setTimeout(resolve, 300));

                progressCallback(100);

                console.log('[FavoritesTab] Recalculation request sent');
            } catch (error) {
                console.error('[FavoritesTab] Recalculation error:', error);
                progressCallback(100);
            }
        }
    },
    components: { GeartrainImg, PitchSetupTable, RecalculationBanner }
}
</script>