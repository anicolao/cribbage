<script lang="ts">
 import { useThrelte } from '@threlte/core';
 import { onMount } from 'svelte';
 import { PMREMGenerator, type WebGLRenderTarget } from 'three';
 import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
 const {scene,renderer,invalidate}=useThrelte();
 onMount(()=>{
  let disposed=false,target:WebGLRenderTarget|undefined;
  const previous=scene.environment,previousIntensity=scene.environmentIntensity;
  void new HDRLoader().loadAsync('/materials/studio.hdr').then(hdr=>{
   if(disposed){hdr.dispose();return;}
   const generator=new PMREMGenerator(renderer);target=generator.fromEquirectangular(hdr);hdr.dispose();generator.dispose();
   scene.environment=target.texture;scene.environmentIntensity=.22;invalidate();
  });
  return()=>{disposed=true;scene.environment=previous;scene.environmentIntensity=previousIntensity;target?.dispose();};
 });
</script>
