<script lang="ts">
 import { T } from '@threlte/core';
 import type { Material, Texture } from 'three';
 import type { SurfaceMaps } from './materials';
 import type { Position } from './table';
 import { roundedShape,slabGeometry } from './geometry';
 import { nameplateTexture } from './textures';
 import Peg from './Peg.svelte';
 let {compact=false,stacked=false,tilt=0,scale=1,glow=0,name,score,pegColor,position=[0,0,0],width=3.9,height=.8,wood,fallback}:{compact?:boolean;stacked?:boolean;tilt?:number;scale?:number;glow?:number;name:string;score?:number;pegColor?:string;position?:Position;width?:number;height?:number;wood?:SurfaceMaps;fallback:Texture}=$props();
 const base=$derived(slabGeometry(roundedShape(width,height,.08),width,height,.12));
 const metal=$derived(slabGeometry(roundedShape(width-.24,height-.18,.045),width-.24,height-.18,.025));
 const baseMaterials:Material[]=[],metalMaterials:Material[]=[];
 const label=$derived(name),points=$derived(score);
 let face=$state.raw<Texture>();
 $effect(()=>{const next=nameplateTexture(label,points,compact,stacked);face=next;return()=>next.dispose();});
 $effect(()=>{const geometry=base;return()=>geometry.dispose();});
 $effect(()=>{const geometry=metal;return()=>geometry.dispose();});
</script>
<T.Group position={[position[0],position[1]+Math.sin(tilt)*height*scale/2,position[2]]} rotation.x={tilt} {scale}>
 <T.Mesh geometry={base} material={baseMaterials} rotation.x={-Math.PI/2} castShadow receiveShadow>
  <T.MeshPhysicalMaterial attach="material.0" map={wood?.color??fallback} normalMap={wood?.normal} normalScale={[.15,.15]} color="#b68151" roughness={.55} clearcoat={.2}/>
  <T.MeshStandardMaterial attach="material.1" color="#372313" roughness={.7}/>
  <T.MeshStandardMaterial attach="material.2" map={wood?.color??fallback} color="#986a44" roughness={.6}/>
 </T.Mesh>
 <T.Mesh geometry={metal} material={metalMaterials} rotation.x={-Math.PI/2} position.y={.12} castShadow receiveShadow>
  <T.MeshPhysicalMaterial attach="material.0" map={face} emissive="#e8b75d" emissiveIntensity={glow*.12} metalness={.38} roughness={.46} clearcoat={.12}/>
  <T.MeshStandardMaterial attach="material.1" color="#6e4d21" metalness={.5} roughness={.5}/>
  <T.MeshStandardMaterial attach="material.2" color="#a37e46" metalness={.5} roughness={.4}/>
 </T.Mesh>
 {#if pegColor}<Peg color={pegColor} position={[-width/2+.43,.14,0]} scale={.9}/>{/if}
 {#each [-1,1] as x}{#each [-1,1] as z}
  <T.Group position={[x*(width/2-.19),.149,z*(height/2-.16)]}>
   <T.Mesh><T.CylinderGeometry args={[.023,.023,.008,16]}/><T.MeshStandardMaterial color="#a4874e" metalness={.65} roughness={.33}/></T.Mesh>
   <T.Mesh position.y={.005}><T.BoxGeometry args={[.027,.002,.004]}/><T.MeshStandardMaterial color="#584221" roughness={.7}/></T.Mesh>
  </T.Group>
 {/each}{/each}
</T.Group>
