<script lang="ts">
 import type {IntersectionEvent} from '@threlte/extras';
 import { T } from '@threlte/core';
 import type { Material, Texture } from 'three';
 import { untrack, onDestroy } from 'svelte';
 import { roundedShape, slabGeometry } from './geometry';
 import { CARD_WIDTH, CARD_HEIGHT } from './sceneLayout';
 import { CARD_DEPTH } from './table';
 let {onhover=()=>{},onpress=()=>{},onactivate=()=>{},interactive=false,hoverable=interactive,glow=0,scale=1,position=[0,0,0],rotation=0,map,backMap,bumpMap,flip=0,width=CARD_WIDTH,height=CARD_HEIGHT,depth=CARD_DEPTH}:{onhover?:(active:boolean)=>void;onpress?:(active:boolean)=>void;onactivate?:()=>void;interactive?:boolean;hoverable?:boolean;glow?:number;scale?:number;position?:[number,number,number];rotation?:number;map:Texture;backMap?:Texture;bumpMap?:Texture;flip?:number;width?:number;height?:number;depth?:number}=$props();
 const body=untrack(()=>slabGeometry(roundedShape(width,height,Math.min(width*.065,.09)),width,height,depth));
 const materials:Material[]=[];
 onDestroy(()=>body.dispose());
</script>
<T.Group {position} rotation.y={rotation} {scale}>
 <T.Group rotation.z={flip}>
  <T.Mesh geometry={body} material={materials} rotation.x={-Math.PI/2} castShadow receiveShadow
   onpointerenter={(event:IntersectionEvent<PointerEvent>)=>{event.stopPropagation();if(hoverable)onhover(true);}}
   onpointerleave={()=>{onhover(false);onpress(false);}}
   onpointerdown={(event:IntersectionEvent<PointerEvent>)=>{event.stopImmediatePropagation();event.stopPropagation();if(interactive)onpress(true);}}
   onpointerup={(event:IntersectionEvent<PointerEvent>)=>{event.stopPropagation();onpress(false);}}
   onclick={(event:IntersectionEvent<MouseEvent>)=>{event.stopPropagation();if(interactive)onactivate();}}>
   <T.MeshPhysicalMaterial attach="material.0" {map} {bumpMap} color={glow>0?'#fff2d7':'#ffffff'} emissive="#e1b55e" emissiveIntensity={glow*.13} bumpScale={.001} roughness={.52} clearcoat={.12} clearcoatRoughness={.4} metalness={0}/>
   <T.MeshStandardMaterial attach="material.1" map={backMap} color={backMap?'#ffffff':'#f3eee2'} roughness={.68}/>
   <T.MeshStandardMaterial attach="material.2" color="#f3eee2" roughness={.73}/>
  </T.Mesh>
 </T.Group>
</T.Group>
