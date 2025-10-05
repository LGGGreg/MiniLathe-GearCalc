<template>
    <g :transform="'translate('+cx+' '+cy+')'" :style="{'fill': gearColor}">
        <path :d="path" />

        <g v-if="sizeText && gearVal.teeth >= 30" :transform="'rotate(' + textRotation + ')'" >
        <defs>
            <filter :id="'textGlow'+id" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
                <feFlood :flood-color="textColor" flood-opacity="0.8" result="color"/>
                <feComposite in="color" in2="blur" operator="in" result="glow"/>
                <feMerge>
                    <feMergeNode in="glow"/>
                    <feMergeNode in="glow"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        <path :id="'curve'+id" stroke="none" fill="none" :d="'M '+(-(pitchR - 3))+' 0 A '+(pitchR - 3)+' '+(pitchR - 3)+' 0 0 0 '+(pitchR - 3)+' 0'" />
        <text width="100" alignment-baseline="baseline" :style="{'font-size':  (gearVal.module.toMetric().number * 8)+'px', 'filter': 'url(#textGlow'+id+')', 'fill': textColor }" style="letter-spacing: 2px; font-weight: bold;" stroke="none">
            <textPath :xlink:href="'#curve'+id">
            {{ gear.toString() }}
            </textPath>
        </text>
        </g>
    </g>
</template>
<script lang="ts">
import { Vector } from '@/bll/math';
import { Gear, Gears } from '@/bll/gear';

export default {
    data() {
        return {id: Math.round(Math.random()*10000)}
    },
    props: {
        cx: {type: Number, default: 0},
        cy: {type: Number, default: 0},
        gear: {type: [Gear, String], required: true},
        module: {type: Number, default: 1},
        sizeText: {type: Boolean, default: false},
        textRotation: {type: Number, default: 0},
        gearColor: {type: String, default: "#DDD"},
        gearId: {type: String, default: ""}
    },
    methods: {
        getPoint(tooth: number, point: number, angleStep: number){

            let angle = tooth * angleStep;
            switch (point) {
                case 0:
                    break;
                case 1:
                    angle += angleStep/3;
                    break;
                case 2:
                    angle += angleStep/2;
                    break;
                case 3:
                    angle += angleStep*5/6;
                    break;
            }
            return Vector.fromAngle(angle, point ==2 || point == 3 ? Gears.outerRadius(this.gearVal)! : Gears.rootRadius(this.gearVal)! )
        }
    },
    computed: {
        gearVal() { return typeof(this.gear) == "string" ? Gear.fromString(this.gear)! : this.gear; },
        pitchR() { return Gears.pitchRadius(this.gearVal)!; },
        textColor() {
            // Calculate text color based on gear color for better contrast
            const color = this.gearColor;
            // Simple approach: use darker version of the gear color
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            // Darken by 40%
            const darkR = Math.floor(r * 0.6);
            const darkG = Math.floor(g * 0.6);
            const darkB = Math.floor(b * 0.6);
            return `rgb(${darkR}, ${darkG}, ${darkB})`;
        },
        path(){
            const angleStep = Math.PI * 2 / this.gearVal.teeth;

            var start = this.getPoint(-1, 3, angleStep);
            let p = "M "+ start.x +" "+start.y+" ";

            for(let i = 0; i< this.gearVal.teeth; i++){
                for(let j = 0; j< 4; j++)
                {
                    var v = this.getPoint(i, j, angleStep);
                    p+= "L "+v.x+" "+v.y+" ";
                }
            }

            return p;
        }
    }
}
</script>