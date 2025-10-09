<template>
    <div>
      <div class="box">
        <LeadscrewWizard v-model="pitch" @saved="saveConfig"/>
      </div>
      <div class="box">
        <GearListEditor v-model="gears" v-model:maxSize="maxSize" @saved="saveConfig" />
      </div>
      <div class="box">
        <OtherParamsEditor v-model:distance="distance" v-model:min-axle-distance-c-d="minAxleDistanceCD" v-model:min-axle-distance-a-b="minAxleDistanceAB" v-model:maxSize="maxSize" v-model:geartrain-size="geartrainSize" @saved="saveConfig" />
      </div>
      <div class="box">
        <div class="control">
          <div class="field">
            <label class="label">Language</label>
            <language-selector />
          </div>  
        </div>
      </div>
      <div class="control">
        <div class="buttons">
            <button class="button is-primary" @click.prevent="saveConfig">
                <span class="icon"><i class="fas fa-calculator"></i></span>
                <span>{{ i18n.setupCalculate }}</span>
              </button>
        </div>
      </div>
    </div>
</template>
<script lang="ts">

import LatheConfig from '@/bll/latheConfig';
import GearListEditor from '../components/Editors/GearListEditor.vue';
import LeadscrewWizard from '../components/LeadscrewWizard.vue';
import OtherParamsEditor from '@/components/OtherParamsEditor.vue';
import GlobalConfig from '@/bll/globalConfig';
import CombinationFinder from '@/bll/combinationFinder';
import LanguageSelector from '@/components/LanguageSelector.vue';

export default {
    data() {
        var mv = GlobalConfig.config;
        var gears = mv?.gears;
        var pitch = mv?.leadscrew;
        var distance = mv?.minTeeth;
        var minAxleDistanceCD = mv?.minAxleDistanceCD;
        var minAxleDistanceAB = mv?.minAxleDistanceAB;
        var maxSize = mv?.maxSize;
        var geartrainSize = mv?.geartrainSize;
        var combinator = new CombinationFinder((b, p) => this.setProgress(b, p));
        return {
            gears,
            pitch,
            distance,
            minAxleDistanceCD,
            minAxleDistanceAB,
            maxSize,
            geartrainSize,
            combinator,
            i18n: GlobalConfig.i18n,
        };
    },
    props: {
      isBusy: { type: Boolean },
      progress: { type: Number }
    },
    methods: {
        async saveConfig(){
            var config = new LatheConfig();
            config.gears = this.gears.slice();
            config.leadscrew = this.pitch;
            config.minTeeth = this.distance;
            config.minAxleDistanceCD = this.minAxleDistanceCD;
            config.minAxleDistanceAB = this.minAxleDistanceAB;
            config.maxSize = this.maxSize;
            config.geartrainSize = this.geartrainSize;

            // Setting config will automatically set needsRecalculation flag if changes detected
            GlobalConfig.config = config;
            GlobalConfig.combos = await this.combinator.findAllCombinationsAsync();

            // Emit event to trigger recalculation banner
            this.$emit("configSaved");
        },
        setProgress(b: boolean, p: number) {
          this.$emit("update:isBusy", b);
          this.$emit("update:progress", p);
        }
    },
    emits: ["update:isBusy", "update:progress", "configSaved"],
    components: { GearListEditor, LeadscrewWizard, OtherParamsEditor, LanguageSelector }
}
</script>