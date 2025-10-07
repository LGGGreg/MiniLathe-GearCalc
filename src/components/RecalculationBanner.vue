<template>
    <div v-if="showBanner" class="notification is-warning recalculation-banner">
        <div class="columns is-vcentered">
            <div class="column">
                <p class="is-size-6">
                    <span class="icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </span>
                    <strong>{{ message }}</strong>
                </p>
            </div>
            <div class="column is-narrow">
                <button 
                    class="button is-primary" 
                    @click="startRecalculation"
                    :disabled="isRecalculating"
                    :class="{ 'is-loading': isRecalculating }">
                    <span class="icon">
                        <i class="fas fa-sync-alt"></i>
                    </span>
                    <span>{{ buttonText }}</span>
                </button>
                <button 
                    class="button is-light ml-2" 
                    @click="dismissBanner"
                    :disabled="isRecalculating">
                    <span>Dismiss</span>
                </button>
            </div>
        </div>
        <progress 
            v-if="isRecalculating" 
            class="progress is-primary mt-3" 
            :value="progress" 
            max="100">
            {{ progress }}%
        </progress>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import GlobalConfig from '@/bll/globalConfig';

export default defineComponent({
    name: 'RecalculationBanner',
    props: {
        message: {
            type: String,
            default: 'Settings have changed. Recalculate favorites for optimal gear combinations?'
        },
        buttonText: {
            type: String,
            default: 'Recalculate Favorites'
        }
    },
    data() {
        return {
            isRecalculating: false,
            progress: 0,
            dismissed: false
        };
    },
    computed: {
        showBanner() {
            // Show banner if recalculation is needed and not dismissed
            // Keep showing during recalculation so progress bar is visible
            return (GlobalConfig.needsRecalculation || this.isRecalculating) && !this.dismissed;
        }
    },
    mounted() {
        console.log('[RecalculationBanner] Mounted, needsRecalculation:', GlobalConfig.needsRecalculation);
    },
    methods: {
        async startRecalculation() {
            console.log('[RecalculationBanner] Starting recalculation...');
            this.isRecalculating = true;
            this.progress = 0;

            try {
                // Call the recalculation handler passed from parent
                // Pass the progress callback so parent can update progress
                this.$emit('recalculate', this.updateProgress);

                // Note: The parent's handler is responsible for calling updateProgress
                // and eventually reaching 100% to hide the banner
            } catch (error) {
                console.error('[RecalculationBanner] Error during recalculation:', error);
                this.isRecalculating = false;
                this.progress = 0;
            }
        },

        updateProgress(value: number) {
            console.log('[RecalculationBanner] Progress update:', value);
            this.progress = Math.min(100, Math.max(0, value));

            // If complete, hide banner after a short delay
            if (this.progress >= 100) {
                console.log('[RecalculationBanner] Recalculation complete, hiding banner');
                setTimeout(() => {
                    this.isRecalculating = false;
                    this.dismissed = false;
                    GlobalConfig.setNeedsRecalculation(false);
                }, 500);
            }
        },
        
        dismissBanner() {
            console.log('[RecalculationBanner] Banner dismissed');
            this.dismissed = true;
            GlobalConfig.setNeedsRecalculation(false);
        },

        // Public method to show banner (called from parent)
        show() {
            console.log('[RecalculationBanner] Showing banner');
            this.dismissed = false;
        }
    }
});
</script>

<style scoped>
.recalculation-banner {
    position: sticky;
    top: 0;
    z-index: 100;
    margin-bottom: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.recalculation-banner .columns {
    margin-bottom: 0;
}

.recalculation-banner .column {
    padding-bottom: 0;
}
</style>

