<script lang="ts">
 import {preferences,ANIMATION_RATES} from './settings';
 import {untrack} from 'svelte';
 import {Canvas} from '@threlte/core';
 import {PCFShadowMap} from 'three';
 import MotionScene from './presentation/MotionScene.svelte';
 import RenderDensity from './RenderDensity.svelte';
 import {buildFrame,type Frame,type CardControl} from './presentation/frame';
 import type {Plan} from './presentation/motion';
 import type {State} from './game/engine';
 import type {CountdownAction} from './game/countdowns';
 import CountdownButton from './CountdownButton.svelte';
 let {game,viewer,pegOrigins,review,action,onAction=()=>{},renderWidth,light=.7,fov=45,resetKey=0,preset='table',faceMargin=2.5,backMargin=2.5,lightX=11,lightY=17,lightZ=8,respectReducedMotion=true,onCameraChange=()=>{},onMotion=()=>{},onSettled=()=>{},onReady=()=>{},onCard=()=>{}}:{game:State;viewer:string;pegOrigins?:Record<string,number>;action?:CountdownAction;onAction?:()=>void;review?:{plan:Plan;time:number;interaction?:{card:string;hover:number;press:number}};renderWidth?:number;light?:number;fov?:number;resetKey?:number;preset?:string;faceMargin?:number;backMargin?:number;lightX?:number;lightY?:number;lightZ?:number;respectReducedMotion?:boolean;onCameraChange?:(info:{elevation:number;distance:number})=>void;onMotion?:(active:boolean,kind:string,duration:number)=>void;onSettled?:(revision:number)=>void;onReady?:()=>void;onCard?:(card:string)=>void}=$props();
 let frame=$state.raw<Frame>(untrack(()=>buildFrame(game,viewer,undefined,pegOrigins))),idle=$state(true),controls=$state<CardControl[]>([]),hovered=$state<string|null>(null),pressed=$state<string|null>(null),active=$state(false),kind=$state('ready'),duration=$state(0),metrics=$state({width:0,height:0,dpr:1});
 function motion(moving:boolean,name:string,seconds:number){active=moving;kind=name;duration=seconds;onMotion(moving,name,seconds);}
 function activate(control:CardControl){if(control.enabled){hovered=null;pressed=null;onCard(control.card);}}
</script>
<div class="table-view" data-table-view data-forced-card={action?.kind==='play'?action.card:''} data-render-awards={JSON.stringify(frame.awards.map(a=>({id:a.id,owner:a.owner,points:a.points,label:a.label,cards:a.cards,opacity:a.scale})))} data-render-pegs={JSON.stringify(frame.pegs.map(p=>({id:p.id,owner:p.owner,score:p.score})))} data-render-counts={JSON.stringify(frame.counts.map(c=>({id:c.id,owner:c.owner,points:c.points,kind:c.kind,cards:c.cards,awarded:c.awarded,opacity:c.scale})))} data-render-scores={JSON.stringify(frame.plates.filter(p=>p.score!==undefined).map(p=>({id:p.id,score:p.score})))} data-hovered-card={hovered??''} data-pressed-card={pressed??''} data-motion-idle={idle} data-motion-active={active} data-motion-kind={kind} data-motion-duration={duration} data-render-width={metrics.width} data-render-height={metrics.height} data-render-dpr={metrics.dpr} data-render-quality="shared-lab" data-render-revision={frame.revision}>
 <Canvas shadows={PCFShadowMap} dpr={1} renderMode="on-demand">
  <RenderDensity width={renderWidth} onMetrics={value=>metrics=value}/>
  <MotionScene animationRate={ANIMATION_RATES[$preferences.animationSpeed]} automaticCard={action?.kind==='play'?`${game.round}:${action.card}`:undefined} {game} {viewer} {pegOrigins} {review} {hovered} {pressed} {respectReducedMotion} settings={{light,fov,resetKey,preset,faceMargin,backMargin,lightX,lightY,lightZ,onCameraChange}} onFrame={(value,settled)=>{frame=value;idle=settled;}} onMotion={motion} {onSettled} {onReady} {onCard} onHover={id=>hovered=id} onPress={id=>pressed=id} onControls={value=>controls=value}/>
 </Canvas>
 <div class="table-readout" style:opacity={frame.status.opacity} aria-hidden="true"><p>{frame.status.primary}</p>{#if frame.status.secondary}<small>{frame.status.secondary}</small>{/if}</div>
 {#if action}<div class="choice-action" data-e2e-fit><CountdownButton {action} onactivate={onAction}/></div>{/if}
 <div class="sr-only" aria-label="Pegging points">{#each frame.awards.filter(a=>a.scale>0) as award (award.id)}<p>{game.players.find(p=>p.id===award.owner)?.name}: {award.label}, {award.points} points</p>{/each}</div>
 <div class="sr-only" aria-label="Counting points">{#each frame.counts.filter(c=>c.scale>0) as count (count.id)}<p>{game.players.find(p=>p.id===count.owner)?.name}’s {count.kind}: {count.points} points</p>{/each}</div>
 <div class="keyboard-cards sr-only" aria-label="Your cards">
  {#each controls as control (control.id)}
   <button type="button" data-card={control.card} data-card-id={control.id} data-hit-x={control.x} data-hit-y={control.y} aria-label={control.label} aria-disabled={!control.enabled} tabindex={control.enabled?0:-1} onclick={()=>activate(control)} onfocus={()=>{if(control.enabled)hovered=control.id;}} onblur={()=>{if(hovered===control.id)hovered=null;}} onkeydown={event=>{if((event.key==='Enter'||event.key===' ')&&control.enabled)pressed=control.id;}} onkeyup={()=>pressed=null}>{control.label}</button>
  {/each}
 </div>
</div>
<style>
 .choice-action{position:absolute;bottom:22px;left:50%;transform:translateX(-50%);z-index:1}.table-view{position:relative;width:100%;height:100%;touch-action:none}.table-readout{position:absolute;top:24px;left:25%;right:25%;text-align:center;pointer-events:none;color:#ecdfc0;font-family:Georgia,serif}.table-readout p{font-size:22px;margin:0}.table-readout small{display:block;font-size:15px;color:#b2baa4;margin-top:10px}.keyboard-cards{position:absolute;width:1px;height:1px;left:0;top:0;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}.keyboard-cards button{outline:none!important;border:0;background:transparent;-webkit-tap-highlight-color:transparent}
</style>
