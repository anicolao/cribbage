<script lang="ts">
 import { useTask, useThrelte } from '@threlte/core';
 let {width,onMetrics=()=>{}}:{width?:number;onMetrics?:(metrics:{width:number;height:number;dpr:number})=>void}=$props();
 const {size,dpr,renderer}=useThrelte();
 let previous='';
 useTask(()=>{const metrics={width:renderer.domElement.width,height:renderer.domElement.height,dpr:renderer.getPixelRatio()},key=JSON.stringify(metrics);if(previous!==key){previous=key;onMetrics(metrics);}},{autoInvalidate:false});
 // Use Threlte's measured viewport rather than the outer CSS scale. Its
 // measurement can lag a transform-only resize; the target buffer stays fixed.
 $effect(()=>{const current=$dpr;const target=width&&$size.width>0?(width+.001)/$size.width:Math.min(window.devicePixelRatio||1,3);if(current!==target)dpr.set(target);});
</script>
