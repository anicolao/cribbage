<script lang="ts">
 import { T, useThrelte } from '@threlte/core';
 import { onDestroy, onMount } from 'svelte';
 import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
 import { type Texture, type Material } from 'three';
 import Environment from './Environment.svelte';
 import type {State} from './game/engine';
 import {deck} from './game/cards';
 import {tablePlayers,heldPose,publicPose,type HitTarget} from './game/layout';
 import HitTargets from './game/HitTargets.svelte';
 import {loadMaterials,disposeMaterials,type MaterialLibrary} from './materials';
 import CameraRig from './CameraRig.svelte';
 import Piece from './Piece.svelte';
 import Board from './Board.svelte';
 import Nameplate from './Nameplate.svelte';
 import { wood, felt, paper, cardTextures, updateCardMargins, tableStitch } from './textures';
 import { seats, starter, cribCards, STACK_STEP } from './table';
 import {cardPose,BOARD_ROTATION,DECK_LAYERS,DECK_POSITION,STARTER_POSITION,CRIB_POSITION,CRIB_OWNER,displayedScore} from './sceneLayout';
 import { roundedShape, faceGeometry, slabGeometry } from './geometry';
 let {game,viewer='',onTargets=()=>{},onReady=()=>{},time=0,scenario='tableau',light=.7,fov=45,resetKey=0,preset='table',faceMargin=2.5,backMargin=2.5,lightX=11,lightY=17,lightZ=8,onCameraChange=()=>{}}:{game?:State;viewer?:string;onTargets?:(targets:HitTarget[])=>void;onReady?:()=>void;time:number;scenario:string;light:number;fov:number;resetKey:number;preset:string;faceMargin:number;backMargin:number;lightX:number;lightY:number;lightZ:number;onCameraChange:(info:{elevation:number;distance:number})=>void}=$props();
 let materials=$state.raw<MaterialLibrary>();
 let environmentReady=$state(false);
 const darkWood=wood(),cloth=felt(),paperGrain=paper(),stitch=tableStitch();
 let cards=$state.raw<Record<string,Texture>>({});
 const {invalidate}=useThrelte();
 $effect(()=>{updateCardMargins(cards,faceMargin/100,backMargin/100);invalidate();});
 onMount(()=>{let disposed=false;void loadMaterials().then(value=>{if(disposed)disposeMaterials(value);else materials=value;});void cardTextures(game?deck:undefined).then(value=>{if(disposed)Object.values(value).forEach(t=>t.dispose());else {cards=value;}});return()=>{disposed=true;};});
 $effect(()=>{if(environmentReady&&materials&&cards.back){requestAnimationFrame(()=>requestAnimationFrame(onReady));}});
 const railGeo=new RoundedBoxGeometry(21.4,.6,15.2,6,.55);
 const matGeo=slabGeometry(roundedShape(20.5,14.3,.4),20.5,14.3,.16);
 const matMaterials:Material[]=[];
 const matFace=faceGeometry(roundedShape(20.5,14.3,.4),20.5,14.3);
 const players=$derived(game?tablePlayers(game,viewer):seats.map((seat,lane)=>({...seat,index:lane,lane})));
 const countSeat=$derived(scenario.startsWith('count-')?seats.findIndex(s=>s.id===scenario.slice(6)):-1);
 onDestroy(()=>{if(materials)disposeMaterials(materials);[darkWood,cloth,paperGrain,stitch,...Object.values(cards),railGeo,matGeo,matFace].forEach(value=>value.dispose());});
</script>
<CameraRig {fov} {resetKey} {preset} onChange={onCameraChange}/>
<Environment onReady={()=>environmentReady=true}/>
<T.HemisphereLight args={['#e5ede6','#38463d',.4*light]}/>
<T.DirectionalLight position={[lightX,lightY,lightZ]} intensity={1.45*light} color="#fff1d4" castShadow shadow.mapSize.width={game?2048:4096} shadow.mapSize.height={game?2048:4096} shadow.camera.left={-13} shadow.camera.right={13} shadow.camera.top={11} shadow.camera.bottom={-11} shadow.camera.near={1} shadow.camera.far={50} shadow.bias={-.000035} shadow.normalBias={.003} shadow.radius={2}/>
<T.DirectionalLight position={[7,9,-8]} intensity={.45*light} color="#c5e0e9" castShadow shadow.mapSize.width={game?1024:2048} shadow.mapSize.height={game?1024:2048} shadow.camera.left={-13} shadow.camera.right={13} shadow.camera.top={11} shadow.camera.bottom={-11} shadow.camera.near={1} shadow.camera.far={40} shadow.bias={-.000035} shadow.normalBias={.003} shadow.radius={1.5}/>
<T.Group rotation.y={.055}>
<T.Mesh geometry={railGeo} position={[0,-.38,0]} castShadow receiveShadow><T.MeshPhysicalMaterial map={materials?.walnut.color??darkWood} normalMap={materials?.walnut.normal} normalScale={[.16,.16]} roughnessMap={materials?.walnut.roughness} color="#bc875b" roughness={.8} clearcoat={.4} clearcoatRoughness={.32}/></T.Mesh>
<T.Mesh geometry={matGeo} material={matMaterials} rotation.x={-Math.PI/2} position.y={-.168} receiveShadow>
 <T.MeshPhysicalMaterial attach="material.0" map={cloth} normalMap={materials?.cloth.normal} normalScale={[.18,.18]} color="#b7c7b3" bumpMap={cloth} bumpScale={.008} roughness={.98} specularIntensity={.18} sheen={.35} sheenColor="#42664e" sheenRoughness={.85}/>
 <T.MeshStandardMaterial attach="material.1" color="#12392e" roughness={1}/>
 <T.MeshStandardMaterial attach="material.2" color="#12392e" roughness={1}/>
</T.Mesh>
<T.Mesh geometry={matFace} rotation.x={-Math.PI/2} position.y={-.008}><T.MeshStandardMaterial map={stitch} transparent roughness={1} depthWrite={false} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/></T.Mesh>
<T.Group rotation.y={BOARD_ROTATION}><Board {time} {scenario} {materials} players={game?game.players.map((p,index)=>({...p,color:seats[index].color})):undefined}/></T.Group>
{#if cards.back}
 <!-- Counting begins with all hands already played face up. -->
 {#each players as seat (seat.id)}
  <T.Group position={[seat.x,0,seat.z]} rotation.y={seat.rotation}>
   {#each seat.cards as id,index (id)}
    {@const state=game?{...heldPose(index,seat.cards.length),faceUp:seat.id===viewer}:cardPose(scenario,time,seat.lane,index)}
    <Piece position={state.position} rotation={state.rotation} map={state.faceUp?cards[id]:cards.back} backMap={cards.back} bumpMap={paperGrain}/>
   {/each}
   {#if game}
    {#each game.plays.filter(play=>play.seat===seat.index) as play,order (play.card)}
     {@const pose=publicPose(order,seat.lane,game.phase==='count'&&game.turn===seat.index&&game.countIndex<4)}
     <Piece position={pose.position} rotation={pose.rotation} map={cards[play.card]} backMap={cards.back} bumpMap={paperGrain}/>
    {/each}
   {/if}
  </T.Group>
  <Nameplate name={seat.name} score={game?seat.score:displayedScore(seat.lane,scenario,time)} pegColor={seat.color} position={[seat.x,.012,seat.z+(seat.lane>=2?-1:1)*(countSeat===seat.lane?.95:1.7)]} wood={materials?.walnut} fallback={darkWood}/>
 {/each}
 {#each Array(DECK_LAYERS) as _,i}<Piece position={[DECK_POSITION[0]+i*.001,DECK_POSITION[1]+i*STACK_STEP,DECK_POSITION[2]]} map={cards.back} backMap={cards.back}/>{/each}
 {#if !game||game.cut}<Piece position={STARTER_POSITION} rotation={-.02} map={cards[game?.cut??starter]} backMap={cards.back} bumpMap={paperGrain}/>{/if}
 {#each game?game.discards.filter(Boolean):cribCards as card,i}<Piece position={[CRIB_POSITION[0]+(game?.countIndex===4&&game.phase==='count'?.15+(i-1.5)*.65:.06*i-.09),CRIB_POSITION[1]+i*STACK_STEP,CRIB_POSITION[2]]} map={game?.countIndex===4&&game.phase==='count'?cards[card!]:cards.back} backMap={cards.back}/>{/each}
 {#if !game||game.phase!=='gathering'}<Nameplate name={`${game?game.players[game.dealer]?.name??'':CRIB_OWNER.name}'s Crib`} position={[CRIB_POSITION[0],.012,CRIB_POSITION[2]+1.65]} width={2.8} height={.62} wood={materials?.walnut} fallback={darkWood}/>{/if}
{/if}
{#if game}<HitTargets {game} {viewer} {onTargets}/>{/if}
</T.Group>
