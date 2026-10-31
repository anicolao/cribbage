<script lang="ts">
 import { useThrelte } from '@threlte/core';
 import { onMount } from 'svelte';
 import { Color, PMREMGenerator, type WebGLRenderTarget } from 'three';
 import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
 let {onReady=()=>{}}:{onReady?:()=>void}=$props();
 const {scene,renderer,invalidate}=useThrelte();
 onMount(()=>{
  let disposed=false,target:WebGLRenderTarget|undefined;
  const previous=scene.environment,previousIntensity=scene.environmentIntensity,previousBackground=scene.background;
  scene.background=new Color('#0e1715');invalidate();
  void new HDRLoader().loadAsync('/materials/studio.hdr').then(hdr=>{
   if(disposed){hdr.dispose();return;}
   const generator=new PMREMGenerator(renderer);target=generator.fromEquirectangular(hdr);hdr.dispose();generator.dispose();
   scene.environment=target.texture;scene.environmentIntensity=.22;invalidate();onReady();
  });
  return()=>{disposed=true;scene.environment=previous;scene.environmentIntensity=previousIntensity;scene.background=previousBackground;target?.dispose();};
 });
</script>
