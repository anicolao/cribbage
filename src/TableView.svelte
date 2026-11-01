<script lang="ts">
 import {cameraMode,cameraLayout,type CameraInfo} from './cameraViews';
 import {tableLayout,type TableLayout} from './presentation/responsive';
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
 let {game,viewer,pegOrigins,review,action,onAction=()=>{},renderWidth,layout:layoutOverride,light=.7,fov,resetKey=0,preset='table',faceMargin=2.5,backMargin=2.5,lightX=11,lightY=17,lightZ=8,respectReducedMotion=true,onCameraChange=()=>{},onMotion=()=>{},onSettled=()=>{},onReady=()=>{},onCard=()=>{}}:{game:State;viewer:string;pegOrigins?:Record<string,number>;action?:CountdownAction;onAction?:()=>void;review?:{plan:Plan;time:number;interaction?:{card:string;hover:number;press:number}};renderWidth?:number;layout?:TableLayout;light?:number;fov?:number;resetKey?:number;preset?:string;faceMargin?:number;backMargin?:number;lightX?:number;lightY?:number;lightZ?:number;respectReducedMotion?:boolean;onCameraChange?:(info:CameraInfo)=>void;onMotion?:(active:boolean,kind:string,duration:number)=>void;onSettled?:(revision:number)=>void;onReady?:()=>void;onCard?:(card:string)=>void}=$props();
 let tableElement:HTMLDivElement|undefined=$state();
 let cameraInfo=$state<CameraInfo>({elevation:0,distance:0,position:[0,0,0],target:[0,0,0]});
 function cameraChanged(info:CameraInfo){cameraInfo=info;onCameraChange(info);}
 let tableSize=$state({width:1180,height:820});
 const layout=$derived(layoutOverride??tableLayout(tableSize.width,tableSize.height));
 const portrait=$derived(layout.endsWith('-portrait')),tabletPortrait=$derived(layout==='ipad-portrait'),landscape=$derived(layout==='phone-landscape');
 $effect(()=>{cameraLayout.set(layout);});
 const effectiveFov=$derived(fov??(layout==='phone-portrait'?60:45));
 $effect(()=>{if(!tableElement)return;const observer=new ResizeObserver(([entry])=>{tableSize={width:entry.contentRect.width,height:entry.contentRect.height};});observer.observe(tableElement);return()=>observer.disconnect();});
 let frame=$state.raw<Frame>(untrack(()=>buildFrame(game,viewer,undefined,pegOrigins))),idle=$state(true),controls=$state<CardControl[]>([]),hovered=$state<string|null>(null),pressed=$state<string|null>(null),active=$state(false),kind=$state('ready'),duration=$state(0),metrics=$state({width:0,height:0,dpr:1});
 function motion(moving:boolean,name:string,seconds:number){active=moving;kind=name;duration=seconds;onMotion(moving,name,seconds);}
 function activate(control:CardControl){if(!$cameraMode&&control.enabled){hovered=null;pressed=null;onCard(control.card);}}
</script>
<div bind:this={tableElement} data-camera-locked={!$cameraMode} data-camera-position={JSON.stringify(cameraInfo.position)} data-camera-target={JSON.stringify(cameraInfo.target)} data-camera-elevation={cameraInfo.elevation} data-camera-distance={cameraInfo.distance} data-layout={layout} class="table-view" class:portrait class:landscape class:has-action={!!action} class:counting={frame.counts.length>0} data-table-view data-forced-card={action?.kind==='play'?action.card:''} data-render-awards={JSON.stringify(frame.awards.map(a=>({id:a.id,owner:a.owner,points:a.points,label:a.label,cards:a.cards,opacity:a.scale})))} data-render-pegs={JSON.stringify(frame.pegs.map(p=>({id:p.id,owner:p.owner,score:p.score})))} data-render-counts={JSON.stringify(frame.counts.map(c=>({id:c.id,owner:c.owner,points:c.points,kind:c.kind,cards:c.cards,awarded:c.awarded,opacity:c.scale})))} data-render-scores={JSON.stringify(frame.plates.filter(p=>p.score!==undefined).map(p=>({id:p.id,score:p.score})))} data-hovered-card={hovered??''} data-pressed-card={pressed??''} data-motion-idle={idle} data-motion-active={active} data-motion-kind={kind} data-motion-duration={duration} data-render-width={metrics.width} data-render-height={metrics.height} data-render-dpr={metrics.dpr} data-render-quality="shared-lab" data-render-revision={frame.revision}>
 <Canvas shadows={PCFShadowMap} dpr={1} renderMode="on-demand">
  <RenderDensity width={renderWidth} onMetrics={value=>metrics=value}/>
  <MotionScene {layout} animationRate={ANIMATION_RATES[$preferences.animationSpeed]} automaticCard={action?.kind==='play'?`${game.round}:${action.card}`:undefined} {game} {viewer} {pegOrigins} {review} {hovered} {pressed} {respectReducedMotion} settings={{viewKey:review?undefined:layout,fitAspect:review?undefined:tableSize.width/Math.max(1,tableSize.height),light,fov:effectiveFov,resetKey,preset:portrait?`${tabletPortrait?'portrait-tablet':'portrait'}${preset==='top'?'-top':preset==='low'?'-low':''}`:landscape?(preset==='top'?'landscape-top':preset==='low'?'landscape-low':'landscape'):preset,faceMargin,backMargin,lightX,lightY,lightZ,onCameraChange:cameraChanged}} onFrame={(value,settled)=>{frame=value;idle=settled;}} onMotion={motion} {onSettled} {onReady} {onCard} onHover={id=>hovered=id} onPress={id=>pressed=id} onControls={value=>controls=value}/>
 </Canvas>
 <div class="table-readout" style:opacity={frame.status.opacity} aria-hidden="true"><p>{frame.status.primary}</p>{#if frame.status.secondary}<small>{frame.status.secondary}</small>{/if}</div>
 {#if action&&!$cameraMode}<div class="choice-action" data-e2e-fit><CountdownButton {action} onactivate={onAction}/></div>{/if}
 <div class="sr-only" aria-label="Pegging points">{#each frame.awards.filter(a=>a.scale>0) as award (award.id)}<p>{game.players.find(p=>p.id===award.owner)?.name}: {award.label}, {award.points} points</p>{/each}</div>
 <div class="sr-only" aria-label="Counting points">{#each frame.counts.filter(c=>c.scale>0) as count (count.id)}<p>{game.players.find(p=>p.id===count.owner)?.name}’s {count.kind}: {count.points} points</p>{/each}</div>
 <div class="keyboard-cards sr-only" aria-label="Your cards">
  {#each controls as control (control.id)}
   <button type="button" data-card={control.card} data-card-id={control.id} data-hit-x={control.x} data-hit-y={control.y} aria-label={control.label} aria-disabled={!control.enabled} tabindex={control.enabled?0:-1} onclick={()=>activate(control)} onfocus={()=>{if(control.enabled)hovered=control.id;}} onblur={()=>{if(hovered===control.id)hovered=null;}} onkeydown={event=>{if((event.key==='Enter'||event.key===' ')&&control.enabled)pressed=control.id;}} onkeyup={()=>pressed=null}>{control.label}</button>
  {/each}
 </div>
</div>
<style>
 .landscape .table-readout{top:43%;left:58%;right:2%}.landscape .table-readout p{font-size:16px}.landscape .table-readout small{display:none}.landscape.counting .table-readout{top:22%}.landscape .choice-action{top:auto;bottom:4px;left:58%}
 .portrait .table-readout{top:18px;left:8%;right:8%}.portrait .table-readout p{font-size:19px}.portrait .table-readout small{font-size:13px;margin-top:6px}.portrait .choice-action{bottom:14px}
 .choice-action{position:absolute;bottom:22px;left:50%;transform:translateX(-50%);z-index:1}.table-view{position:relative;width:100%;height:100%;touch-action:none}.table-readout{position:absolute;top:24px;left:25%;right:25%;text-align:center;pointer-events:none;color:#ecdfc0;font-family:Georgia,serif}.table-readout p{font-size:22px;margin:0}.table-readout small{display:block;font-size:15px;color:#b2baa4;margin-top:10px}.keyboard-cards{position:absolute;width:1px;height:1px;left:0;top:0;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}.keyboard-cards button{outline:none!important;border:0;background:transparent;-webkit-tap-highlight-color:transparent}
</style>
