<script lang="ts">
 import { T } from '@threlte/core';
 import type { Material, Texture } from 'three';
 import { untrack, onDestroy } from 'svelte';
 import { roundedShape, slabGeometry } from './geometry';
 import { CARD_WIDTH, CARD_HEIGHT } from './sceneLayout';
 import { CARD_DEPTH } from './table';
 let {position=[0,0,0],rotation=0,map,backMap,bumpMap,flip=0,width=CARD_WIDTH,height=CARD_HEIGHT,depth=CARD_DEPTH}:{position?:[number,number,number];rotation?:number;map:Texture;backMap?:Texture;bumpMap?:Texture;flip?:number;width?:number;height?:number;depth?:number}=$props();
 const body=untrack(()=>slabGeometry(roundedShape(width,height,Math.min(width*.065,.09)),width,height,depth));
 const materials:Material[]=[];
 onDestroy(()=>body.dispose());
</script>
<T.Group {position} rotation.y={rotation}>
 <T.Group rotation.z={flip}>
  <T.Mesh geometry={body} material={materials} rotation.x={-Math.PI/2} castShadow receiveShadow>
   <T.MeshPhysicalMaterial attach="material.0" {map} {bumpMap} bumpScale={.001} roughness={.52} clearcoat={.12} clearcoatRoughness={.4} metalness={0}/>
   <T.MeshStandardMaterial attach="material.1" map={backMap} color={backMap?'#ffffff':'#f3eee2'} roughness={.68}/>
   <T.MeshStandardMaterial attach="material.2" color="#f3eee2" roughness={.73}/>
  </T.Mesh>
 </T.Group>
</T.Group>
