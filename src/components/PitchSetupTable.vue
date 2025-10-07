<template>
    <div class="pitch-setup-table"
         :style="{
           '--gear-a-color': config.gearColors.gearA,
           '--gear-b-color': config.gearColors.gearB,
           '--gear-c-color': config.gearColors.gearC,
           '--gear-d-color': config.gearColors.gearD
         }">
      <DataGrid
        v-model="filteredModel"
        v-model:columns="cols"
        v-model:sortByColumn="order"
        v-model:sortAscending="ascending"
        v-model:selectedItems="selectedItems"
        :isSortable="isSortable"
        :selectionMode="GridSelectionMode.One"
        :isExportEnabled="isExportEnabled"
        :isPrintEnabled="isPrintEnabled && !isNativeApp"
        :isItemsPerPageEditable="isItemsPerPageEditable"
        :itemsPerPage="itemsPerPage"
        :rowCommands="rowCommands"
        :emptyText="i18n.genericEmpty"
        :exportText="i18n.genericExportCsv"
        :printText="i18n.genericPrint"
        :downloader="ref(downloader)"
        :pagingFooterText="'{0}/{1}'"/>
    </div>
</template>
<script lang="ts">
import GlobalConfig from '@/bll/globalConfig';
import DataGrid, { GridSelectionMode } from '@rozzy/vue-datagrid/src/DataGrid.vue';
import { GridColumnDefinition } from '@rozzy/vue-datagrid/src/GridColumnDefinition';
import { GridRowCommandDefinition, type IGridRowCommandDefinition } from '@rozzy/vue-datagrid/src/GridCommandDefinition';

import { PitchSetup } from '@/bll/pitchSetup';
import { GearHelper, PitchHelper } from './gridHelpers';
import { DeviceHelper } from '@/bll/device';
import GCDownloader from '@/grid/Downloader';
import { ref } from 'vue';

export class AddToFavoritesRowCommand extends GridRowCommandDefinition {
    public constructor(){
        super((item => GlobalConfig.addFavorite(item)));
        this.withIcon("far fa-heart")
            .withClass("is-small")
            .withLabel(GlobalConfig.i18n.genericAddToFavorites)
            .withFilter((item) => !GlobalConfig.isFavorite(item));
    }
}
export class RemoveFavoriteRowCommand extends GridRowCommandDefinition {
    public constructor(){
        super((item => GlobalConfig.removeFavorite(item)));
        this.withIcon("fas fa-heart")
            .withClass("is-small")
            .withLabel(GlobalConfig.i18n.genericRemoveFavorite)
            .withFilter((item) => GlobalConfig.isFavorite(item));
    }
}

export default {
    data() {
        const i18n = GlobalConfig.i18n;
        const downloader = new GCDownloader();

        // Build columns array - conditionally include name column
        const columns = [];

        // Add name column if items have a name property
        if (this.showNameColumn) {
            columns.push(
                new GridColumnDefinition("name", i18n.ptName, i => i.name)
                    .withStyle("width: 15%")
            );
        }

        // Add pitch columns (Pi and Pm) with conditional greying
        columns.push(
            new GridColumnDefinition("pi", "Pi", i => i.pitch, i18n.genericPitch+' ('+i18n.genericImperial+')')
                .withFormat(PitchHelper.formatFnShowImperialGreyed)
                .withHtml()
                .withSortForValues(PitchHelper.sortFnPreferImperial)
                .withStyle("width: 20%")
                .withAlignRight().withHeaderAlignRight(),
            new GridColumnDefinition("pm", "Pm", i => i.pitch, i18n.genericPitch+' ('+i18n.genericMetric+')')
                .withFormat(PitchHelper.formatFnShowMetricGreyed)
                .withHtml()
                .withSortForValues(PitchHelper.sortFnPreferMetric)
                .withStyle("width: 20%")
                .withAlignRight().withHeaderAlignRight()
        );

        // Add gear columns (A, B, C, D) with colored text using CSS classes
        columns.push(
            new GridColumnDefinition("a", "A", i => i.gearA)
                .withFormat(g => GearHelper.formatFn(g, () => this.hideModules))
                .withExportFn(g => g.toString())
                .withSortForValues(GearHelper.sortFn)
                .withStyle("width: 10%")
                .withCssClasses(['gear-a-color'])
                .withAlignRight().withHeaderAlignRight(),
            new GridColumnDefinition("b", "B", i => i.gearB)
                .withFormat(g => GearHelper.formatFn(g, () => this.hideModules))
                .withExportFn(g => g.toString())
                .withSortForValues(GearHelper.sortFn)
                .withStyle("width: 10%")
                .withCssClasses(['gear-b-color'])
                .withAlignRight().withHeaderAlignRight(),
            new GridColumnDefinition("c", "C", i => {
                // Return object with gear and flag indicating if B=C
                const isBEqualsC = i.gearB && i.gearC &&
                    i.gearB.teeth === i.gearC.teeth &&
                    i.gearB.module.value === i.gearC.module.value;
                return { gear: i.gearC, isBEqualsC };
            })
                .withFormat(obj => {
                    // Show blank if gear C equals gear B (simplified 2-gear setup)
                    if (obj?.isBEqualsC) {
                        return "";
                    }
                    return GearHelper.formatFn(obj?.gear, () => this.hideModules);
                })
                .withExportFn(obj => obj?.gear?.toString() ?? "")
                .withSortForValues((a, b) => GearHelper.sortFn(a?.gear, b?.gear))
                .withStyle("width: 10%")
                .withCssClasses(['gear-c-color'])
                .withAlignRight().withHeaderAlignRight(),
            new GridColumnDefinition("d", "D", i => i.gearD)
                .withFormat(g => GearHelper.formatFn(g, () => this.hideModules))
                .withExportFn(g => g.toString())
                .withSortForValues(GearHelper.sortFn)
                .withStyle("width: 10%")
                .withCssClasses(['gear-d-color'])
                .withAlignRight().withHeaderAlignRight()
        );

        return {
            cols: columns,
            isNativeApp: true,
            config: GlobalConfig.config,
            favorites: GlobalConfig.favorites,
            downloader,
            i18n,
            ref: ref,
            GridSelectionMode: GridSelectionMode
        };
    },
    props: {
        modelValue: { type: Array<PitchSetup>, required: true },
        orderBy: { type: String, default: undefined },
        orderAscending: { type: Boolean, default: true },
        filter: { type: Object, default: null },
        isSortable: {type: Boolean, default: true },
        isItemsPerPageEditable: {type: Boolean, default: false},
        selectedItem: {type: PitchSetup},
        isExportEnabled: {type: Boolean, default: false},
        isPrintEnabled: {type: Boolean, default: false},
        itemsPerPage: {type: Number, default: Number.POSITIVE_INFINITY},
        rowCommands: {type: Array<IGridRowCommandDefinition>, default: [] as IGridRowCommandDefinition[] },
        hideModules: {type: Boolean, default: false},
        showNameColumn: {type: Boolean, default: false},
    },
    computed: {
        filteredModel() {
            let src = [];
            if (this.filter == null)
                src = this.modelValue;
            else
                src = this.modelValue.filter(this.filter.filter);
            return src;
        },
        order: {
            get(): string | undefined { return this.orderBy; },
            set(v: string | undefined) { this.$emit("update:orderBy", v); }
        },
        ascending: {
            get(): boolean { return this.orderAscending; },
            set(v: boolean) { this.$emit("update:orderAscending", v); }
        },
        selectedItems: {
            get(): Array<any> { return [this.selectedItem]; },
            set(v: Array<any>) { this.$emit("update:selectedItem", v.length > 0 ? v[0] : null); }
        },        
        isMultiModule() {
            return this.config.isMultiModule;
        }
    },
    async created() {
        this.isNativeApp = await DeviceHelper.isNativeApp();
    },
    components: { DataGrid }
}
</script>
<style>
/* Gear color classes - use CSS variables from parent */
.pitch-setup-table .gear-a-color {
    color: var(--gear-a-color) !important;
    font-weight: 600 !important;
}

.pitch-setup-table .gear-b-color {
    color: var(--gear-b-color) !important;
    font-weight: 600 !important;
}

.pitch-setup-table .gear-c-color {
    color: var(--gear-c-color) !important;
    font-weight: 600 !important;
}

.pitch-setup-table .gear-d-color {
    color: var(--gear-d-color) !important;
    font-weight: 600 !important;
}
</style>