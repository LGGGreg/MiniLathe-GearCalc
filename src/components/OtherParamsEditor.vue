<template>
    <div>
        <div v-if="isEditMode">
            <NumericEditor v-model="distanceValue" :label="i18n.otherAxleDistance" :tip="i18n.otherAxleDistanceTip" :decimals="0" :min-value="50" :max-value="200" :required="true"
            v-model:isValid="isDistanceValid" @enter="save()"/>
            <NumericEditor v-model="minAxleDistanceCDValue" label="Min C-D Axle Distance (mm)" tip="Minimum distance between C and D axles" :decimals="0" :min-value="20" :max-value="100" :required="true"
            v-model:isValid="isMinAxleDistanceCDValid" @enter="save()"/>
            <NumericEditor v-model="minAxleDistanceABValue" label="Min A-B Axle Distance (mm)" tip="Minimum distance between A and B axles" :decimals="0" :min-value="20" :max-value="100" :required="true"
            v-model:isValid="isMinAxleDistanceABValid" @enter="save()"/>
            <NumericEditor v-model="maxSizeValue" :label="i18n.otherMaxGearSize" :tip="i18n.otherMaxGearSizeTip" :decimals="0" :min-value="50" :max-value="200" :required="true"
            v-model:isValid="isMaxSizeValid" @enter="save()"/>
            <NumericEditor v-model="geartrainSizeValue" label="Geartrain illustration scale" :decimals="1" :min-value=".5" :max-value="2" :required="true"
            v-model:isValid="isGeartrainSizeValid" @enter="save()"/>
        </div>
        
        
       <div v-else>
            <div class="field">
                <label class="label">{{ i18n.otherAxleDistance }}</label>
                <div class="control">
                    <div class="tags">
                        <span class="tag is-link">
                            {{ distance.toString() }}
                        </span>
                    </div>
                </div>
            </div>
            <div class="field">
                <label class="label">Min C-D Axle Distance (mm)</label>
                <div class="control">
                    <div class="tags">
                        <span class="tag is-link">
                            {{ minAxleDistanceCD.toString() }}
                        </span>
                    </div>
                </div>
            </div>
            <div class="field">
                <label class="label">Min A-B Axle Distance (mm)</label>
                <div class="control">
                    <div class="tags">
                        <span class="tag is-link">
                            {{ minAxleDistanceAB.toString() }}
                        </span>
                    </div>
                </div>
            </div>
            <div class="field">
                <label class="label">{{ i18n.otherMaxGearSize }}</label>
                <div class="control">
                    <div class="tags">
                        <span class="tag is-link">
                            {{ maxSize.toString() }}
                        </span>
                    </div>
                </div>
            </div>
            <div class="field">
                <label class="label">Geartrain illustration scale</label>
                <div class="control">
                    <div class="tags">
                        <span class="tag is-link">
                            {{ GcMath.toFixedMax(geartrainSize,1) }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
&nbsp;
        <div class="field">
            <div class="control buttons">
                <button v-if="isEditMode" class="button is-success" @click.prevent="save()" :disabled="!isMaxSizeValid || !isDistanceValid || !isMinAxleDistanceCDValid || !isMinAxleDistanceABValid">
                <span class="icon"><i class="fas fa-check"></i></span>
                <span>{{ i18n.genericSave }}</span>
              </button>
                <button v-if="!isEditMode" class="button is-danger" @click.prevent="edit()">
                <span class="icon"><i class="fas fa-pen"></i></span>
                <span>{{ i18n.genericEdit }}</span>
              </button>
            </div>
        </div>
    </div>
</template>
<script lang="ts">
import GlobalConfig from '@/bll/globalConfig';
import GcMath from '@/bll/math';
import NumericEditor from './Editors/NumericEditor.vue';

export default {
    data(props) {
        return {
            distanceValue: props.distance,
            minAxleDistanceCDValue: props.minAxleDistanceCD,
            minAxleDistanceABValue: props.minAxleDistanceAB,
            maxSizeValue: props.maxSize,
            geartrainSizeValue: props.geartrainSize,

            isDistanceValid: true,
            isMinAxleDistanceCDValid: true,
            isMinAxleDistanceABValid: true,
            isMaxSizeValid: true,
            isGeartrainSizeValid: true,
            isEditMode: props.distance == null || props.maxSize == null,
            i18n: GlobalConfig.i18n,
            GcMath
        };
    },
    methods: {
        save() {
            if(!this.isDistanceValid || !this.isMaxSizeValid || !this.isMinAxleDistanceCDValid || !this.isMinAxleDistanceABValid)
                return;
            this.$emit("update:distance", this.distanceValue);
            this.$emit("update:minAxleDistanceCD", this.minAxleDistanceCDValue);
            this.$emit("update:minAxleDistanceAB", this.minAxleDistanceABValue);
            this.$emit("update:maxSize", this.maxSizeValue);
            this.$emit("update:geartrainSize", this.geartrainSizeValue);
            this.$emit("saved");
            this.isEditMode = false;
        },
        edit(){
            this.isEditMode = true;
            this.distanceValue = this.distance;
            this.minAxleDistanceCDValue = this.minAxleDistanceCD;
            this.minAxleDistanceABValue = this.minAxleDistanceAB;
            this.maxSizeValue = this.maxSize;
            this.geartrainSizeValue = this.geartrainSize;
            // Reset validation state when entering edit mode
            this.isDistanceValid = true;
            this.isMinAxleDistanceCDValid = true;
            this.isMinAxleDistanceABValid = true;
            this.isMaxSizeValid = true;
            this.isGeartrainSizeValid = true;
        }
    },
    props: {
        distance: { type: Number, default: 85 },
        minAxleDistanceCD: { type: Number, default: 44 },
        minAxleDistanceAB: { type: Number, default: 34 },
        maxSize: { type: Number, default: 130 },
        geartrainSize: {type: Number, default: 2}
    },
    emits: ["update:distance", "update:minAxleDistanceCD", "update:minAxleDistanceAB", "update:maxSize", "update:geartrainSize", "saved" ],
    watch: {
        modelValue() {
            if(this.isEditMode)
                console.warn("model changed while editing");
        }
    },
    components: { NumericEditor }
}
</script>