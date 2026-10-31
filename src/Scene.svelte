<script lang="ts">
 import { T, useThrelte } from '@threlte/core';
 import { onDestroy, onMount } from 'svelte';
 import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
 import { type Texture, type Material } from 'three';
 import Environment from './Environment.svelte';
 import type {Frame} from './presentation/frame';
 import Peg from './Peg.svelte';
 import {deck} from './game/cards';
 import {loadMaterials,disposeMaterials,type MaterialLibrary} from './materials';
 import CameraRig from './CameraRig.svelte';
 import Piece from './Piece.svelte';
 import Board from './Board.svelte';
 import Nameplate from './Nameplate.svelte';
 import FeltScore from './FeltScore.svelte';
 import { wood, felt, paper, cardTextures, updateCardMargins, tableStitch } from './textures';
 import {BOARD_ROTATION} from './sceneLayout';
 import { roundedShape, faceGeometry, slabGeometry } from './geometry';
 let {frame,onHover=()=>{},onPress=()=>{},onCard=()=>{},canInteract=()=>false,canInspect=canInteract,onReady=()=>{},light=.7,fov=45,resetKey=0,preset='table',faceMargin=2.5,backMargin=2.5,lightX=11,lightY=17,lightZ=8,onCameraChange=()=>{}}:{frame:Frame;onHover?:(id:string|null)=>void;onPress?:(id:string|null)=>void;onCard?:(card:string)=>void;canInteract?:(card:string)=>boolean;canInspect?:(card:string)=>boolean;onReady?:()=>void;light:number;fov:number;resetKey:number;preset:string;faceMargin:number;backMargin:number;lightX:number;lightY:number;lightZ:number;onCameraChange:(info:{elevation:number;distance:number})=>void}=$props();
 let hoveredCard:string|null=null;
 function cardHover(id:string,active:boolean){
  if(!active&&hoveredCard!==id)return;
  hoveredCard=active?id:null;onHover(hoveredCard);
 }
 let materials=$state.raw<MaterialLibrary>();
 let environmentReady=$state(false);
 const darkWood=wood(),cloth=felt(),paperGrain=paper(),stitch=tableStitch();
 let cards=$state.raw<Record<string,Texture>>({});
 const {invalidate}=useThrelte();
 $effect(()=>{updateCardMargins(cards,faceMargin/100,backMargin/100);invalidate();});
 onMount(()=>{let disposed=false;void loadMaterials().then(value=>{if(disposed)disposeMaterials(value);else materials=value;});void cardTextures(deck).then(value=>{if(disposed)Object.values(value).forEach(t=>t.dispose());else {cards=value;}});return()=>{disposed=true;};});
 $effect(()=>{if(environmentReady&&materials&&cards.back){requestAnimationFrame(()=>requestAnimationFrame(onReady));}});
 const railGeo=new RoundedBoxGeometry(21.4,.6,15.2,6,.55);
 const matGeo=slabGeometry(roundedShape(20.5,14.3,.4),20.5,14.3,.16);
 const matMaterials:Material[]=[];
 const matFace=faceGeometry(roundedShape(20.5,14.3,.4),20.5,14.3);
 onDestroy(()=>{if(materials)disposeMaterials(materials);[darkWood,cloth,paperGrain,stitch,...Object.values(cards),railGeo,matGeo,matFace].forEach(value=>value.dispose());});
</script>
<CameraRig {fov} {resetKey} {preset} onChange={onCameraChange}/>
<Environment onReady={()=>environmentReady=true}/>
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
<T.Group rotation.y={BOARD_ROTATION}><Board {materials}/></T.Group>
{#each frame.pegs as peg (peg.id)}<Peg color={peg.color} position={peg.position} scale={peg.scale} glow={peg.glow}/>{/each}
{#if cards.back}
 {#each frame.cards as card (card.id)}
  <Piece position={card.position} rotation={card.rotation} flip={card.flip} scale={card.scale} glow={card.glow} map={cards[card.card]} backMap={cards.back} bumpMap={paperGrain}
   interactive={card.zone==='hand'&&!!card.owner&&canInteract(card.card)} hoverable={card.zone==='hand'&&canInspect(card.card)}
   onhover={active=>cardHover(card.id,active)} onpress={active=>onPress(active?card.id:null)} onactivate={()=>onCard(card.card)}/>
 {/each}
 {#each frame.plates as plate (plate.id)}
  {#if plate.scorePosition&&plate.score!==undefined}<FeltScore score={plate.score} position={plate.scorePosition} opacity={plate.scale}/>{/if}
  <Nameplate name={plate.name} pegColor={plate.color} position={plate.position} scale={plate.scale} glow={plate.glow} width={plate.id==='crib-label'?2.8:3.9} height={plate.id==='crib-label'?.62:.8} wood={materials?.walnut} fallback={darkWood}/>
 {/each}
{/if}
</T.Group>
