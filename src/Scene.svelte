<script lang="ts">
 import { T, useThrelte } from '@threlte/core';
 import { onDestroy, onMount } from 'svelte';
 import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
 import { type Texture, type Material } from 'three';
 import Environment from './Environment.svelte';
 import {loadMaterials,disposeMaterials,type MaterialLibrary} from './materials';
 import CameraRig from './CameraRig.svelte';
 import Piece from './Piece.svelte';
 import Board from './Board.svelte';
 import Nameplate from './Nameplate.svelte';
 import { wood, felt, paper, cardTextures, updateCardMargins, tableStitch } from './textures';
 import { seats, starter, cribCards, STACK_STEP } from './table';
 import {cardPose,BOARD_ROTATION,DECK_LAYERS,DECK_POSITION,STARTER_POSITION,CRIB_POSITION,CRIB_OWNER,displayedScore} from './sceneLayout';
 import { roundedShape, faceGeometry, slabGeometry } from './geometry';
 let {time=0,scenario='tableau',light=.7,fov=45,resetKey=0,preset='table',faceMargin=2.5,backMargin=2.5,lightX=11,lightY=17,lightZ=8,onCameraChange=()=>{}}:{time:number;scenario:string;light:number;fov:number;resetKey:number;preset:string;faceMargin:number;backMargin:number;lightX:number;lightY:number;lightZ:number;onCameraChange:(info:{elevation:number;distance:number})=>void}=$props();
 let materials=$state.raw<MaterialLibrary>();
 const darkWood=wood(),cloth=felt(),paperGrain=paper(),stitch=tableStitch();
 let cards=$state.raw<Record<string,Texture>>({});
 const {invalidate}=useThrelte();
 $effect(()=>{updateCardMargins(cards,faceMargin/100,backMargin/100);invalidate();});
 onMount(()=>{let disposed=false;void loadMaterials().then(value=>{if(disposed)disposeMaterials(value);else materials=value;});void cardTextures().then(value=>{if(disposed)Object.values(value).forEach(t=>t.dispose());else cards=value;});return()=>{disposed=true;};});
 const railGeo=new RoundedBoxGeometry(21.4,.6,15.2,6,.55);
 const matGeo=slabGeometry(roundedShape(20.5,14.3,.4),20.5,14.3,.16);
 const matMaterials:Material[]=[];
 const matFace=faceGeometry(roundedShape(20.5,14.3,.4),20.5,14.3);
 const countSeat=$derived(scenario.startsWith('count-')?seats.findIndex(s=>s.id===scenario.slice(6)):-1);
 onDestroy(()=>{if(materials)disposeMaterials(materials);[darkWood,cloth,paperGrain,stitch,...Object.values(cards),railGeo,matGeo,matFace].forEach(value=>value.dispose());});
</script>
<CameraRig {fov} {resetKey} {preset} onChange={onCameraChange}/>
<Environment/>
<T.Color attach="background" args={['#0e1715']}/>
<T.HemisphereLight args={['#e5ede6','#38463d',.4*light]}/>
<T.DirectionalLight position={[lightX,lightY,lightZ]} intensity={1.45*light} color="#fff1d4" castShadow shadow.mapSize.width={4096} shadow.mapSize.height={4096} shadow.camera.left={-13} shadow.camera.right={13} shadow.camera.top={11} shadow.camera.bottom={-11} shadow.camera.near={1} shadow.camera.far={50} shadow.bias={-.000035} shadow.normalBias={.003} shadow.radius={2}/>
<T.DirectionalLight position={[7,9,-8]} intensity={.45*light} color="#c5e0e9" castShadow shadow.mapSize.width={2048} shadow.mapSize.height={2048} shadow.camera.left={-13} shadow.camera.right={13} shadow.camera.top={11} shadow.camera.bottom={-11} shadow.camera.near={1} shadow.camera.far={40} shadow.bias={-.000035} shadow.normalBias={.003} shadow.radius={1.5}/>
<T.Group rotation.y={.055}>
<T.Mesh geometry={railGeo} position={[0,-.38,0]} castShadow receiveShadow><T.MeshPhysicalMaterial map={materials?.walnut.color??darkWood} normalMap={materials?.walnut.normal} normalScale={[.16,.16]} roughnessMap={materials?.walnut.roughness} color="#bc875b" roughness={.8} clearcoat={.4} clearcoatRoughness={.32}/></T.Mesh>
<T.Mesh geometry={matGeo} material={matMaterials} rotation.x={-Math.PI/2} position.y={-.168} receiveShadow>
 <T.MeshPhysicalMaterial attach="material.0" map={cloth} normalMap={materials?.cloth.normal} normalScale={[.18,.18]} color="#b7c7b3" bumpMap={cloth} bumpScale={.008} roughness={.98} specularIntensity={.18} sheen={.35} sheenColor="#42664e" sheenRoughness={.85}/>
 <T.MeshStandardMaterial attach="material.1" color="#12392e" roughness={1}/>
 <T.MeshStandardMaterial attach="material.2" color="#12392e" roughness={1}/>
</T.Mesh>
<T.Mesh geometry={matFace} rotation.x={-Math.PI/2} position.y={-.008}><T.MeshStandardMaterial map={stitch} transparent roughness={1} depthWrite={false} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/></T.Mesh>
<T.Group rotation.y={BOARD_ROTATION}><Board {time} {scenario} {materials}/></T.Group>
{#if cards.back}
 <!-- Counting begins with all hands already played face up. -->
 {#each seats as seat,lane}
  <T.Group position={[seat.x,0,seat.z]} rotation.y={seat.rotation}>
   {#each seat.cards as id,index}
    {@const state=cardPose(scenario,time,lane,index)}
    <Piece position={state.position} rotation={state.rotation} map={state.faceUp?cards[id]:cards.back} backMap={cards.back} bumpMap={paperGrain}/>
   {/each}

  </T.Group>
  <Nameplate name={seat.name} score={displayedScore(lane,scenario,time)} pegColor={seat.color} position={[seat.x,.012,seat.z+(lane>=2?-1:1)*(countSeat===lane?.95:1.7)]} wood={materials?.walnut} fallback={darkWood}/>
 {/each}
 {#each Array(DECK_LAYERS) as _,i}<Piece position={[DECK_POSITION[0]+i*.001,DECK_POSITION[1]+i*STACK_STEP,DECK_POSITION[2]]} map={cards.back} backMap={cards.back}/>{/each}
 <Piece position={STARTER_POSITION} rotation={-.02} map={cards[starter]} backMap={cards.back} bumpMap={paperGrain}/>
 {#each cribCards as _,i}<Piece position={[CRIB_POSITION[0]+.06*i-.09,CRIB_POSITION[1]+i*STACK_STEP,CRIB_POSITION[2]]} map={cards.back} backMap={cards.back}/>{/each}
 <Nameplate name={`${CRIB_OWNER.name}'s Crib`} position={[CRIB_POSITION[0],.012,CRIB_POSITION[2]+1.65]} width={2.8} height={.62} wood={materials?.walnut} fallback={darkWood}/>
{/if}

</T.Group>
