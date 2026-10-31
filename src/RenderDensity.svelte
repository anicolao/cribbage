<script lang="ts">
 import { useThrelte } from '@threlte/core';
 let {width}:{width?:number}=$props();
 const {size,dpr}=useThrelte();
 // Use Threlte's measured viewport rather than the outer CSS scale. Its
 // measurement can lag a transform-only resize; the target buffer stays fixed.
 $effect(()=>{const current=$dpr;const target=width&&$size.width>0?(width+.001)/$size.width:Math.min(window.devicePixelRatio||1,2);if(current!==target)dpr.set(target);});
</script>
