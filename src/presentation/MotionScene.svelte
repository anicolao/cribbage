<script lang="ts">
 import {useTask,useThrelte} from '@threlte/core';
 import {interactivity} from '@threlte/extras';
 import {onMount,untrack} from 'svelte';
 import type {State} from '../game/engine';
 import {legalCards,needsDiscard} from '../game/engine';
 import {buildFrame,type Frame} from './frame';
 import {MOTION,planMotion,sampleMotion,interactionPose,interactionLevel,type Plan} from './motion';
 import Scene from '../Scene.svelte';
 import CardTelemetry from './CardTelemetry.svelte';
 import type {CardControl} from './frame';
 let {game,viewer,pegOrigins,review,automaticCard,hovered=null,pressed=null,respectReducedMotion=true,onFrame=()=>{},onMotion=()=>{},onSettled=()=>{},onHover=()=>{},onPress=()=>{},onCard=()=>{},onControls=()=>{},onReady=()=>{},settings}:{game:State;viewer:string;automaticCard?:string;pegOrigins?:Record<string,number>;review?:{plan:Plan;time:number;interaction?:{card:string;hover:number;press:number}};hovered?:string|null;pressed?:string|null;respectReducedMotion?:boolean;onFrame?:(frame:Frame,idle:boolean)=>void;onMotion?:(active:boolean,kind:string,duration:number)=>void;onSettled?:(revision:number)=>void;onHover?:(id:string|null)=>void;onPress?:(id:string|null)=>void;onCard?:(card:string)=>void;onControls?:(controls:CardControl[])=>void;onReady?:()=>void;settings:{light:number;fov:number;resetKey:number;preset:string;faceMargin:number;backMargin:number;lightX:number;lightY:number;lightZ:number;onCameraChange:(info:{elevation:number;distance:number})=>void}}=$props();
 interactivity();
 const {invalidate,renderer}=useThrelte();
 let frame=$state.raw<Frame>(untrack(()=>buildFrame(game,viewer,undefined,pegOrigins))),base=untrack(()=>frame);
 let previous=untrack(()=>game),previousViewer=untrack(()=>viewer),plan:Plan|undefined,start=0,reduced=false;
 let major=$state(false);
 const levels=new Map<string,{hover:number;press:number;hFrom:number;pFrom:number;hTarget:number;pTarget:number;hStart:number;pStart:number}>();
 let lastMotion='',lastSettled=-1,motionName='ready',motionSeconds=0;
 onMount(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');reduced=media.matches;const update=()=>{reduced=media.matches;};media.addEventListener('change',update);return()=>media.removeEventListener('change',update);});
 function publish(now:number,dt=.016){
  if(review){base=sampleMotion(review.plan,review.time);major=review.time<review.plan.duration;}
  else if(plan){const t=(now-start)/1000;base=sampleMotion(plan,t);major=t<plan.duration;if(!major)plan=undefined;}
  let interactionActive=false;
  const activeHover=hovered,activePress=pressed;
  const cards=base.cards.map(card=>{
   if(review?.interaction){const i=review.interaction;return interactionPose(card,i?.card===card.id?i.hover:0,i?.card===card.id?i.press:0);}
   if(review&&automaticCard===card.id)return interactionPose(card,.35,0);
   if(major){levels.delete(card.id);return card;}
   const level=levels.get(card.id)??{hover:0,press:0,hFrom:0,pFrom:0,hTarget:0,pTarget:0,hStart:now,pStart:now};
   const h=card.id===activeHover&&card.zone==='hand'?1:card.id===automaticCard&&card.zone==='hand'?.35:0,p=card.id===activePress&&card.zone==='hand'?1:0;
   if(h!==level.hTarget){level.hFrom=level.hover;level.hTarget=h;level.hStart=now;}
   if(p!==level.pTarget){level.pFrom=level.press;level.pTarget=p;level.pStart=now;}
   level.hover=respectReducedMotion&&reduced?h:interactionLevel(level.hFrom,h,(now-level.hStart)/1000);
   level.press=respectReducedMotion&&reduced?p:interactionLevel(level.pFrom,p,(now-level.pStart)/1000);
   interactionActive ||= level.hover!==h||level.press!==p;levels.set(card.id,level);
   return interactionPose(card,level.hover,level.press);
  });
  frame={...base,cards};
  const idle=!major&&!interactionActive;
  const signature=`${major}:${review?.plan.kind??motionName}`;
  if(signature!==lastMotion){lastMotion=signature;onMotion(major,review?.plan.kind??motionName,review?.plan.duration??motionSeconds);}
  if(!major&&base.revision!==lastSettled){lastSettled=base.revision;onSettled(base.revision);}
  onFrame(frame,idle);invalidate();return interactionActive;
 }
 $effect(()=>{
  const next=game,nextViewer=viewer,controlled=review,origins=pegOrigins;
  untrack(()=>{
   if(controlled){plan=undefined;publish(performance.now());return;}
   if(next===previous&&nextViewer===previousViewer)return;
   const hydrate=nextViewer!==previousViewer||(previous.revision===0&&next.revision>1)||next.revision<previous.revision;
   if(next.revision===previous.revision&&!hydrate){previous=next;return;}
   plan=hydrate||respectReducedMotion&&reduced?undefined:planMotion(previous,next,nextViewer,frame,origins);
   if(!plan){base=buildFrame(next,nextViewer,frame,origins);major=false;}
   previous=next;previousViewer=nextViewer;start=performance.now();lastSettled=-1;motionName=plan?.kind??'ready';motionSeconds=plan?.duration??0;
   interactionActive=publish(start);
  });
 });
 $effect(()=>{hovered;pressed;automaticCard;untrack(()=>{interactionActive=publish(performance.now());});});
 let lastTick=performance.now(),interactionActive=false;
 useTask(()=>{const now=performance.now(),dt=Math.min(.1,(now-lastTick)/1000);lastTick=now;if(plan||interactionActive){interactionActive=publish(now,dt);}}, {autoInvalidate:false});
 function available(card:string){const seat=game.players.findIndex(p=>p.id===viewer);return !major&&seat>=0&&game.hands[seat].includes(card)&&(needsDiscard(game,seat)||game.phase==='pegging'&&game.turn===seat&&legalCards(game,seat).includes(card));}
 function inspectable(card:string){const seat=game.players.findIndex(p=>p.id===viewer);return !major&&seat>=0&&game.hands[seat].includes(card);}
 function hover(id:string|null){onHover(id);renderer.domElement.style.cursor=id?'pointer':'';}
</script>
<Scene {frame} {...settings} {onReady} onHover={hover} {onPress} onCard={card=>{if(available(card)){onHover(null);onPress(null);onCard(card);}}} canInteract={card=>available(card)} canInspect={card=>inspectable(card)}/>
<CardTelemetry {game} {viewer} {frame} blocked={major} onControls={onControls}/>
